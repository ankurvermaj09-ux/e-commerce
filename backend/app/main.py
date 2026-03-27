from fastapi import FastAPI, HTTPException, Depends, Header
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel,Field
from pymongo import MongoClient
from bson import ObjectId
from jose import jwt, JWTError, ExpiredSignatureError
from datetime import datetime, timedelta
from fastapi import Query
from datetime import datetime
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import bcrypt
from calendar import month_abbr
from fastapi import UploadFile, File
import shutil
import os
from fastapi import UploadFile, File, Form
import os
import shutil


from fastapi.staticfiles import StaticFiles

from app.utils import password

security = HTTPBearer()



def hash_password(password: str) -> str:
    return bcrypt.hashpw(
        password.encode("utf-8"),
        bcrypt.gensalt()
    ).decode("utf-8")


def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(
        password.encode("utf-8"),
        hashed.encode("utf-8")
    )






# =========================
# CONFIG
# =========================
SECRET_KEY = "my_super_secret_key123456789"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60

# =========================
# JWT HELPERS
# =========================
def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    token = credentials.credentials
    try:
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
    allow_origins=["*"],   ##["http://localhost:5173","http://127.0.0.1:5173","http://localhost:8081","http://192.168.1.12:5000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")
# =========================
# DATABASE
# =========================
client = MongoClient("mongodb://localhost:27017")
db = client["minie"]
product_collection = db["products"]
user_collection = db["users"]
cart_collection = db["carts"]
order_collection = db["orders"]
wishlist_collection= db["wishlists"]
review_collection = db["reviews"]
store_details_collection = db["storedetails"]


UPLOAD_FOLDER = "uploads"

if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)


# =========================
# MODELS
# =========================
class Product(BaseModel):
    product_id: int
    name: str
    price: int
    qty: int
    image: str

class CheckoutRequest(BaseModel):
    full_name:str
    phone:str
    address:str
    city:str
    pincode:str

class UserProfile(BaseModel):
    full_name:str
    phone: str
    address: str
    city: str
    pincode: str

class Review(BaseModel):
    user_id:int
    product_id:int
    rating:int=Field(...,ge=1,le=5)
    comment:str
    created_at:datetime =Field(default_factory=datetime.now)







class RegisterRequest(BaseModel):
    email: str
    password: str




class LoginRequest(BaseModel):
    email:str
    password:str

class ProductCreate(BaseModel):
    name: str
    price: float
    qty: int
    category: str
    image: str
    description: str



# =========================
# AUTH
# =========================

@app.post("/register")
def register(data: RegisterRequest):
    # 1. Check email uniqueness
    if user_collection.find_one({"email": data.email}):
        raise HTTPException(status_code=400, detail="Email already registered")
    last_user = user_collection.find_one(sort=[("user_id",-1)])

    if last_user:
        new_user_id =last_user["user_id"] + 1
    else:
        new_user_id = 1

    user = {
        "user_id": new_user_id,
        "email": data.email,
        "password_hash": hash_password(data.password),
        "role": "user"
    }

    user_collection.insert_one(user)
    return {"message": "User registered successfully"}


@app.post("/login")
def login(data: LoginRequest):
    user = user_collection.find_one({"email": data.email})
    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials")

    if not verify_password(data.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    print(f"--- LOGIN ATTEMPT --- Email received: {data.email}")

    token = create_access_token({
        "user_id": user["user_id"],
        "email": user["email"],
        "role": user["role"]
    })

    return {"access_token": token}


# Update user profile
@app.put("/user/profile")
def update_profile(profile: UserProfile, user=Depends(get_current_user)):
    user_collection.update_one(
        {"user_id": user["user_id"]},
        {"$set": {
            "profile": profile.model_dump()
        }}
    )
    return {"message": "Profile updated successfully"}

# Get user profile
@app.get("/user/profile")
def get_profile(user=Depends(get_current_user)):
    user_data = user_collection.find_one({"user_id": user["user_id"]}, {"_id": 0, "password_hash": 0})
    return user_data.get("profile") or {}




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

@app.get("/products/category/{cat_name}")
def get_products_by_category(cat_name: str):
    # This filters the database for products matching the category
    products = list(product_collection.find({"category": cat_name}))
    return products




@app.get("/bestsellers")
def bestsellers():
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
                    "total_sold":0
                }
            sales[pid]["total_sold"]+=item["qty"]

    # Convert dict → list and sort
    sorted_result = sorted(
        sales.values(),
        key=lambda x: x["total_sold"],
        reverse=True
    )[:5]


    final_result=[
        {"product_id":p["product_id"],"name":p["name"],"image":p["image"]}
        for p in sorted_result
    ]

    return final_result

@app.get("/store_details")
def store_details():
    settings = store_details_collection.find_one({"_id": "global_store_settings"})

    if settings:
        return settings
    return {"message": "Store details not found"}




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
def checkout(request: CheckoutRequest, user=Depends(get_current_user)):
    user_id = user["user_id"]

    # Fetch the cart
    cart = cart_collection.find_one({"user_id": user_id})
    if not cart or not cart["items"]:
        raise HTTPException(status_code=400, detail="Cart is empty")

    shipping_tax = 100

    tax_amount=0
    total=0
    reserved_items = []

    try:
        for item in cart["items"]:
            # Atomic Update: Check stock and decrement
            result = product_collection.update_one(
                {"product_id": item["product_id"], "qty": {"$gte": item["qty"]}},
                {"$inc": {"qty": -item["qty"]}}
            )

            if result.modified_count == 0:
                # Rollback logic
                for r_item in reserved_items:
                    product_collection.update_one(
                        {"product_id": r_item["product_id"]},
                        {"$inc": {"qty": r_item["qty"]}}
                    )
                raise HTTPException(status_code=400, detail=f"Stock error: {item['name']}")

            reserved_items.append(item)
            total += item["price"] * item["qty"]
            tax_amount =total %18
            total = total + tax_amount+shipping_tax


        # 🟢 THE CHANGE: Store shipping_details in the order
        order_collection.insert_one({
            "user_id": user_id,
            "email": user["email"],
            "items": cart["items"],
            "total": total,
            "shipping_cost": shipping_tax,
            "tax_cost": tax_amount,
            "status": "pending",
            "created_at": datetime.now(),
            "shipping_details": request.model_dump() # Saves address info
        })

        cart_collection.delete_one({"user_id": user_id})
        return {"message": "Checkout successful", "total": total}

    except Exception as e:
        if isinstance(e, HTTPException): raise e
        raise HTTPException(status_code=500, detail=str(e))

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

@app.put("/cart/increase")
def increase_cart_item(product_id: int = Query(...), user=Depends(get_current_user)):
    cart = cart_collection.find_one({"user_id": user["user_id"]})
    if not cart:
        raise HTTPException(status_code=404, detail="Cart not found")

    for item in cart["items"]:
        if item["product_id"] == product_id:
            item["qty"] += 1
            break
    else:
        raise HTTPException(status_code=404, detail="Item not in cart")

    cart_collection.update_one(
        {"user_id": user["user_id"]},
        {"$set": {"items": cart["items"]}}
    )

    return {"message": "Quantity increased"}



@app.put("/cart/decrease")
def decrease_cart_item(product_id: int = Query(...), user=Depends(get_current_user)):
    cart = cart_collection.find_one({"user_id": user["user_id"]})
    if not cart:
        raise HTTPException(status_code=404, detail="Cart not found")

    new_items = []
    for item in cart["items"]:
        if item["product_id"] == product_id:
            if item["qty"] > 1:
                item["qty"] -= 1
                new_items.append(item)
            # else: qty == 1 → remove item
        else:
            new_items.append(item)

    cart_collection.update_one(
        {"user_id": user["user_id"]},
        {"$set": {"items": new_items}}
    )

    return {"message": "Quantity updated"}




# =========================
# WISHLIST
# =========================


@app.get("/wishlist")
def view_wishlist(user=Depends(get_current_user)):
    wishlist = wishlist_collection.find_one({"user_id": user["user_id"]}, {"_id": 0})
    return wishlist or {"items": []}


@app.post("/wishlist")
def add_to_wishlist(product_id: int = Query(...), user=Depends(get_current_user)):
    user_id = user["user_id"]

    # 1. Ensure we query with the correct type (int)
    product = product_collection.find_one({"product_id": int(product_id)})
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    wishlist = wishlist_collection.find_one({"user_id": user_id})
    if not wishlist:
        wishlist = {"user_id": user_id, "items": []}

    items = wishlist.get("items", [])
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
            "image": product["image"]
        })

    # 4. Save back to DB
    wishlist_collection.update_one(
        {"user_id": user_id},
        {"$set": {"items": items}},
        upsert=True
    )
    return {"message": "wishlist updated", "items": items}


@app.delete("/wishlist/{product_id}")
def remove_from_cart(product_id: int, user=Depends(get_current_user)):
    wishlist_collection.update_one(
        {"user_id": user["user_id"]},
        {"$pull": {"items": {"product_id": product_id}}}
    )
    return {"message": "Item removed"}








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



# @app.get("/admin/stats")
# def admin_stats(user = Depends(get_current_user)):
#     # 1. Only admin can access
#     if user["role"] != "admin":
#         raise HTTPException(status_code=403, detail="Admin access required")
#
#     # 2. Fetch all orders
#     orders = list(order_collection.find({"status":"delivered"}))
#
#     # 3. Calculate stats
#     total_orders = len(orders)
#     total_revenue = sum(o.get("total", 0) for o in orders)
#
#     pending_orders = sum(1 for o in orders if o.get("status") == "pending")
#     delivered_orders = sum(1 for o in orders if o.get("status") == "delivered")
#
#     # 4. Return stats
#     return {
#         "total_orders": total_orders,
#         "total_revenue": total_revenue,
#         "pending_orders": pending_orders,
#         "delivered_orders": delivered_orders
#     }



@app.get("/admin/stats")
def admin_stats(user=Depends(get_current_user)):
    if user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")

    from datetime import datetime
    from calendar import monthrange

    now = datetime.now()
    start_of_this_month = datetime(now.year, now.month, 1)

    # Previous month
    if now.month == 1:
        prev_year = now.year - 1
        prev_month = 12
    else:
        prev_year = now.year
        prev_month = now.month - 1

    start_of_last_month = datetime(prev_year, prev_month, 1)

    # Fetch orders
    all_orders = list(order_collection.find())
    delivered_orders = [o for o in all_orders if o["status"].lower() == "delivered"]
    cancelled_orders = [o for o in all_orders if o["status"].lower() == "cancelled"]

    total_orders = len(all_orders)
    total_revenue = sum(o.get("total", 0) for o in delivered_orders)

    # Cancellation Rate
    cancellation_rate = (
        (len(cancelled_orders) / total_orders) * 100
        if total_orders > 0 else 0
    )

    # Average Order Value
    average_order_value = (
        total_revenue / len(delivered_orders)
        if len(delivered_orders) > 0 else 0
    )

    # Revenue Growth %
    this_month_revenue = sum(
        o["total"] for o in delivered_orders
        if o["created_at"] >= start_of_this_month
    )

    last_month_revenue = sum(
        o["total"] for o in delivered_orders
        if start_of_last_month <= o["created_at"] < start_of_this_month
    )

    revenue_growth = (
        ((this_month_revenue - last_month_revenue) / last_month_revenue) * 100
        if last_month_revenue > 0 else 0
    )

    return {
        "total_orders": total_orders,
        "total_revenue": total_revenue,
        "cancellation_rate": round(cancellation_rate, 2),
        "average_order_value": round(average_order_value, 2),
        "revenue_growth": round(revenue_growth, 2)
    }


@app.post("/admin/products")
async def add_product(
    name: str = Form(...),
    price: float = Form(...),
    qty: int = Form(...),
    category: str = Form(...),
    description: str = Form(...),
    image: UploadFile = File(...),
    user=Depends(get_current_user)
):
    if user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Admin only")

    # 1️⃣ Create uploads folder if not exists
    os.makedirs("uploads", exist_ok=True)

    # 2️⃣ Save image
    file_path = f"uploads/{image.filename}"
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(image.file, buffer)

    # 3️⃣ Create product_id automatically
    product_id = product_collection.count_documents({}) + 1

    # 4️⃣ Insert into DB
    product_collection.insert_one({
        "product_id": product_id,
        "name": name,
        "price": price,
        "qty": qty,
        "category": category,
        "description": description,
        "image": file_path
    })

    return {"message": "Product added successfully"}



@app.get("/admin/stats/category_sales")
def admin_stats(user=Depends(get_current_user)):
    if user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")

    try:
        pipeline = [
            {"$match": {"status": {"$regex":"^delivered$", "$options":"i"}}},
            {"$unwind": "$items"},
            {
                "$lookup": {
                    "from": "products",
                    "localField": "items.product_id",
                    "foreignField": "product_id",
                    "as": "product_info"
                }
            },
            {"$unwind": "$product_info"},
            {
                "$group": {
                    "_id": "$product_info.category",
                    "revenue": {
                        "$sum":{
                            "$multiply":[
                                "$items.qty",
                                "$items.price"
                            ]
                        }
                    }
                }
            },
            {"$sort": {"revenue": -1}},
        ]
        results=list(order_collection.aggregate(pipeline))

        formatted=[
            {
                "category":r["_id"],
                "revenue":r["revenue"]
            }
            for r in results
        ]
        return formatted
    except Exception as e:
        print(e)
        raise HTTPException(status_code=404, detail="Product not found")


# @app.get("/admin/stats/monthly")
# def get_monthly_stats(user=Depends(get_current_user)):
#     if user["role"] != "admin":
#         raise HTTPException(status_code=403, detail="Admin only")
#
#     try:
#         # 1. Get the current month's start date
#         now = datetime.now()
#         start_of_month = datetime(now.year, now.month, 1)
#
#         # 2. Query MongoDB for orders created this month
#         pipeline = [
#             {"$match": {"created_at": {"$gte": start_of_month},"status":"delivered"}},
#             {"$group": {"_id": None, "total": {"$sum": "$total"}}}
#         ]
#
#         result = list(order_collection.aggregate(pipeline))
#
#         # 3. Use the exact key name your frontend expects: "monthly_revenue"
#         monthly_revenue = result[0]["total"] if result else 0
#
#         return {"monthly_revenue": monthly_revenue}
#
#     except Exception as e:
#         print(f"Error: {e}")  # This will show up in your Python terminal
#         raise HTTPException(status_code=500, detail="Internal Server Error during stats calculation")



@app.get("/admin/stats/monthly")
def get_monthly_stats(user=Depends(get_current_user)):
    if user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Admin only")

    try:
        pipeline = [
            {
                "$match": {
                    "status": "delivered"
                }
            },
            {
                "$group": {
                    "_id": {
                        "year": {"$year": "$created_at"},
                        "month": {"$month": "$created_at"}
                    },
                    "revenue": {"$sum": "$total"}
                }
            },
            {
                "$sort": {
                    "_id.year": 1,
                    "_id.month": 1
                }
            }
        ]

        results = list(order_collection.aggregate(pipeline))

        formatted = []
        for r in results:
            month_number = r["_id"]["month"]
            month_name = month_abbr[month_number]  # Jan, Feb, Mar...
            formatted.append({
                "month": month_name,
                "revenue": r["revenue"]
            })

        return formatted

    except Exception as e:
        print(f"Error: {e}")
        raise HTTPException(status_code=500, detail="Error calculating monthly stats")




@app.get("/admin/stats/bestsellers")
def best_sellers(user=Depends(get_current_user)):
    if user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Admin only")

    orders = list(order_collection.find({"status":"delivered"}))

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


@app.get("/admin/stats/order-ratio")
def order_status_ration(user=Depends(get_current_user)):
    if user["role"]!="admin":
        raise HTTPException(status_code=403, detail="Admin only")
    try:
        pipeline = [
            {
                "$group": {
                    "_id":"$status",
                    "count":{"$sum":1}
                }
            }
        ]
        results = list(order_collection.aggregate(pipeline))
        data={
            "delivered":0,
            "cancelled":0,
            "pending":0,
            "shipped":0,
        }
        for r in results:
            data[r["_id"]]=r["count"]

        return data
    except Exception as e:
        print(e)
        raise HTTPException(status_code=500, detail="Error calculating order ratio")



@app.get("/admin/stats/pending")
def pending_stats(user=Depends(get_current_user)):
    if user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Admin only")

    orders = list(order_collection.find({"status":"pending"}))
    total_pending_cost = sum(o.get("total", 0) for o in orders)
    for o in orders:
        o["_id"]=str(o["_id"])
    return {
        "pending_orders": orders,
        "pending_cost": total_pending_cost
    }


@app.get("/admin/stats/cancelled")
def cancelled_stats(user=Depends(get_current_user)):
    if user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Admin only")

    orders = list(order_collection.find({"status":"cancelled"}))
    cancelled_orders_cost= sum(o.get("total", 0) for o in orders)

    for o in orders:
        o["_id"] = str(o["_id"])
    return {
        "cancelled_orders": orders,
         "cancelled_cost": cancelled_orders_cost
    }




@app.get("/admin/users/search")
def search_users(q: str, user=Depends(get_current_user)):
    if user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Admin only")

    # This searches both the email and the nested full_name inside profile
    users = list(
        user_collection.find(
            {
                "$or": [
                    {"email": {"$regex": q, "$options": "i"}},
                    {"profile.full_name": {"$regex": q, "$options": "i"}}
                ]
            },
            {"_id": 0, "password_hash": 0}
        )
    )

    return {"users": users}








# =========================
# REVIEW
# =========================



@app.post("/products/{product_id}/reviews")
def add_reviews(product_id: int, review_data: Review, user=Depends(get_current_user)):
    verified_user_id = user["user_id"]

    order = order_collection.find_one({
        "user_id": verified_user_id,
        "items.product_id": product_id
    })

    if not order:
        raise HTTPException(
            status_code=403,
            detail="You can only review products you have purchased."
        )
    new_review_data ={
        "user_id": verified_user_id,
        "product_id": product_id,
        "rating": review_data.rating,
        "comment": review_data.comment,
        "created_at": datetime.now(),
    }
    review_collection.insert_one(new_review_data)

    return {"message":"review added successfully"}





@app.get("/products/{product_id}/reviews")
def get_reviews(product_id: int):
    pipeline = [
        # 1. Filter reviews for this product
        {"$match": {"product_id": product_id}},

        # 2. Join with 'users' collection
        {
            "$lookup": {
                "from": "users",  # Target collection
                "localField": "user_id",  # Field in 'reviews'
                "foreignField": "user_id",  # Field in 'users'
                "as": "user_info"  # Temporary array for joined data
            }
        },

        # 3. Clean up: Flatten the 'user_info' array and keep only the name
        {"$unwind": "$user_info"},
        {"$project": {
            "_id": 1,
            "rating": 1,
            "comment": 1,
            "created_at": 1,
            "username": "$user_info.name"  # Or "name" if you store that
        }}
    ]

    reviews = list(review_collection.aggregate(pipeline))

    for r in reviews:
        r["_id"] = str(r["_id"])

    return reviews


@app.put("/admin/promote/{user_id}")
def promote_to_admin(user_id: int, current_user=Depends(get_current_user)):
    if current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Not authorized")

    # Use the integer user_id instead of the MongoDB ObjectId
    result = user_collection.update_one(
        {"user_id": user_id},
        {"$set": {"role": "admin"}}
    )

    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="User not found")

    return {"message": "User promoted successfully"}


@app.put("/admin/products/{product_id}/stock")
def update_product_stock(product_id: int, qty: int, user=Depends(get_current_user)):
    if user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Admin only")

    result = product_collection.update_one(
        {"product_id": product_id},
        {"$set": {"qty": qty}}
    )

    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Product not found")

    return {"message": "Stock updated"}


@app.get("/admin/stats/top-customers")
def get_top_customers(user=Depends(get_current_user)):
    if user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Admin only")

    # Aggregate orders by user_id
    pipeline = [
        {"$match": {"status": "delivered"}},
        {"$group": {
            "_id": "$user_id",
            "email": {"$first": "$email"},
            "total_spent": {"$sum": "$total"},
            "order_count": {"$sum": 1}
        }},
        {"$sort": {"total_spent": -1}},
        {"$limit": 5}
    ]

    results = list(order_collection.aggregate(pipeline))
    return results



