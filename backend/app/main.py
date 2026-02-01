from fastapi import FastAPI, HTTPException, Depends, Header
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from pymongo import MongoClient
from bson import ObjectId
from jose import jwt, JWTError, ExpiredSignatureError
from datetime import datetime, timedelta
from fastapi import Query
from datetime import datetime

# =========================
# CONFIG
# =========================
SECRET_KEY = "my_super_secret_key123456789"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

# =========================
# JWT HELPERS
# =========================
def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def get_current_user(authorization: str = Header(...)):
    try:
        scheme, token = authorization.split(" ")
        if scheme.lower() != "bearer":
            raise HTTPException(status_code=401, detail="Invalid auth scheme")

        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload

    except ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")


# =========================
# APP SETUP
# =========================
app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173","http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# =========================
# DATABASE
# =========================
client = MongoClient("mongodb://localhost:27017")
db = client["minie"]
product_collection = db["products"]
user_collection = db["users"]
cart_collection = db["carts"]
order_collection = db["orders"]

# =========================
# MODELS
# =========================
class Product(BaseModel):
    product_id: int
    name: str
    price: int
    qty: int
    image: str


class User(BaseModel):
    user_id: int
    name: str
    role: str


class LoginRequest(BaseModel):
    name: str


# =========================
# AUTH
# =========================





@app.post("/login")
def login(data: LoginRequest):
    user = user_collection.find_one({"name": data.name}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    token = create_access_token({
        "user_id": user["user_id"],
        "role": user["role"],
        "name": user["name"]
    })

    return {"access_token": token, "token_type": "bearer"}


# =========================
# PRODUCTS
# =========================
@app.get("/products")
def get_products():
    return list(product_collection.find({}, {"_id": 0}))


@app.get("/products/search")
def search_products(q: str):
    return list(product_collection.find(
        {"name": {"$regex": q, "$options": "i"}},
        {"_id": 0}
    ))


@app.post("/products")
def add_product(product: Product, user=Depends(get_current_user)):
    if user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Admin only")

    product_collection.insert_one(product.model_dump())
    return {"message": "Product added"}


# =========================
# CART (JWT BASED)
# =========================
@app.get("/cart")
def view_cart(user=Depends(get_current_user)):
    cart = cart_collection.find_one({"user_id": user["user_id"]}, {"_id": 0})
    return cart or {"items": []}


@app.post("/cart")
def add_to_cart(product_id: int = Query(...), user=Depends(get_current_user)):
    user_id = user["user_id"]

    # 1. Ensure we query with the correct type (int)
    product = product_collection.find_one({"product_id": int(product_id)})
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    cart = cart_collection.find_one({"user_id": user_id})
    if not cart:
        cart = {"user_id": user_id, "items": []}

    items = cart.get("items", [])
    found = False
    for item in items:
        if item["product_id"] == int(product_id):
            if item["qty"] + 1 > product["qty"]:
                raise HTTPException(status_code=400, detail="Out of stock")
            item["qty"] += 1
            found = True
            break

    if not found:
        items.append({
            "product_id": product["product_id"],
            "name": product["name"],
            "price": product["price"],
            "qty": 1,
            "image": product["image"]
        })

    # 4. Save back to DB
    cart_collection.update_one(
        {"user_id": user_id},
        {"$set": {"items": items}},
        upsert=True
    )
    return {"message": "Cart updated", "items": items}




@app.delete("/cart/{product_id}")
def remove_from_cart(product_id: int, user=Depends(get_current_user)):
    cart_collection.update_one(
        {"user_id": user["user_id"]},
        {"$pull": {"items": {"product_id": product_id}}}
    )
    return {"message": "Item removed"}


# =========================
# CHECKOUT
# =========================
@app.post("/checkout")
def checkout(user=Depends(get_current_user)):
    user_id = user["user_id"]

    # 1. Fetch the cart
    cart = cart_collection.find_one({"user_id": user_id})
    if not cart or not cart["items"]:
        raise HTTPException(status_code=400, detail="Cart is empty")

    total = 0
    reserved_items = []

    try:
        for item in cart["items"]:
            # 2. Atomic Update: Only decrement if current qty >= requested qty
            result = product_collection.update_one(
                {
                    "product_id": item["product_id"],
                    "qty": {"$gte": item["qty"]}
                },
                {"$inc": {"qty": -item["qty"]}}
            )

            # 3. Check if the update actually happened
            if result.modified_count == 0:
                # If we fail here, we need to "roll back" the items already decremented
                for r_item in reserved_items:
                    product_collection.update_one(
                        {"product_id": r_item["product_id"]},
                        {"$inc": {"qty": r_item["qty"]}}
                    )
                raise HTTPException(
                    status_code=400,
                    detail=f"Insufficient stock for item: {item['name']}"
                )

            reserved_items.append(item)
            total += item["price"] * item["qty"]

        # 4. Create the order
        order_collection.insert_one({
            "user_id": user_id,
            "items": cart["items"],
            "total": total,
            "status": "pending",
            "created_at": datetime.now()
        })

        # 5. Clear the cart
        cart_collection.delete_one({"user_id": user_id})

        return {"message": "Checkout successful", "total": total}

    except Exception as e:
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(status_code=500, detail="An internal error occurred during checkout")


# =========================
# ORDERS
# =========================
@app.get("/orders")
def get_orders(user=Depends(get_current_user)):
    orders = list(order_collection.find({"user_id": user["user_id"]}))
    for o in orders:
        o["_id"] = str(o["_id"])
    return {"orders": orders}


@app.get("/orders/details/{order_id}")
def get_order_details(order_id: str, user=Depends(get_current_user)):
    order = order_collection.find_one({"_id": ObjectId(order_id)}, {"_id": 0})
    if not order or order["user_id"] != user["user_id"]:
        raise HTTPException(status_code=404, detail="Order not found")
    return order


@app.put("/orders/{order_id}/cancel")
def cancel_order(order_id: str, user=Depends(get_current_user)):
    order = order_collection.find_one({"_id": ObjectId(order_id)})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    if order["user_id"] != user["user_id"]:
        raise HTTPException(status_code=403, detail="Not your order")

    if order["status"] != "pending":
        raise HTTPException(status_code=400, detail="Only pending orders can be cancelled")

    for item in order["items"]:
        product_collection.update_one(
            {"product_id": item["product_id"]},
            {"$inc": {"qty": item["qty"]}}
        )

    order_collection.update_one(
        {"_id": ObjectId(order_id)},
        {"$set": {"status": "cancelled"}}
    )

    return {"message": "Order cancelled"}


# =========================
# ADMIN orders
# =========================
@app.get("/admin/orders")
def admin_orders(user=Depends(get_current_user)):
    if user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Admin only")

    orders = list(order_collection.find())
    for o in orders:
        o["_id"] = str(o["_id"])
    return orders


@app.put("/admin/orders/{order_id}/status")
def update_status(order_id: str, status: str, user=Depends(get_current_user)):
    if user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Admin only")

    order = order_collection.find_one({"_id": ObjectId(order_id)})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    transitions = {
        "pending": ["shipped", "cancelled"],
        "shipped": ["delivered"],
        "delivered": [],
        "cancelled": []
    }

    if status not in transitions[order["status"]]:
        raise HTTPException(status_code=400, detail="Invalid status change")

    order_collection.update_one(
        {"_id": ObjectId(order_id)},
        {"$set": {"status": status}}
    )

    return {"message": "Status updated"}



# =========================
# ADMIN stats
# =========================



@app.get("/admin/stats")
def admin_stats(user = Depends(get_current_user)):
    # 1. Only admin can access
    if user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")

    # 2. Fetch all orders
    orders = list(order_collection.find())

    # 3. Calculate stats
    total_orders = len(orders)
    total_revenue = sum(o.get("total", 0) for o in orders)

    pending_orders = sum(1 for o in orders if o.get("status") == "pending")
    delivered_orders = sum(1 for o in orders if o.get("status") == "delivered")

    # 4. Return stats
    return {
        "total_orders": total_orders,
        "total_revenue": total_revenue,
        "pending_orders": pending_orders,
        "delivered_orders": delivered_orders
    }


@app.get("/admin/stats/monthly")
def get_monthly_stats(user=Depends(get_current_user)):
    if user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Admin only")

    try:
        # 1. Get the current month's start date
        now = datetime.now()
        start_of_month = datetime(now.year, now.month, 1)

        # 2. Query MongoDB for orders created this month
        pipeline = [
            {"$match": {"created_at": {"$gte": start_of_month}}},
            {"$group": {"_id": None, "total": {"$sum": "$total"}}}
        ]

        result = list(order_collection.aggregate(pipeline))

        # 3. Use the exact key name your frontend expects: "monthly_revenue"
        monthly_revenue = result[0]["total"] if result else 0

        return {"monthly_revenue": monthly_revenue}

    except Exception as e:
        print(f"Error: {e}")  # This will show up in your Python terminal
        raise HTTPException(status_code=500, detail="Internal Server Error during stats calculation")




@app.get("/admin/stats/bestsellers")
def best_sellers(user=Depends(get_current_user)):
    if user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Admin only")

    orders = list(order_collection.find())

    sales = {}

    for order in orders:
        for item in order["items"]:
            pid = item["product_id"]

            if pid not in sales:
                sales[pid] = {
                    "product_id": pid,
                    "name": item["name"],
                    "image": item["image"],
                    "total_sold": 0,
                    "revenue": 0
                }

            sales[pid]["total_sold"] += item["qty"]
            sales[pid]["revenue"] += item["qty"] * item["price"]

    # Convert dict → list and sort
    result = sorted(
        sales.values(),
        key=lambda x: x["total_sold"],
        reverse=True
    )[:5]

    return {"products": result}




@app.get("/admin/users/search")
def search_users(q: str, user=Depends(get_current_user)):
    # Admin-only
    if user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Admin only")

    users = list(
        user_collection.find(
            {"name": {"$regex": q, "$options": "i"}},
            {"_id": 0, "password": 0}  # hide sensitive fields
        )
    )

    return {"users": users}
