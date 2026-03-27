from pymongo import MongoClient

client = MongoClient("mongodb://localhost:27017")

db = client["minie"]

product_collection = db["products"]
user_collection = db["users"]
cart_collection = db["carts"]
order_collection = db["orders"]
wishlist_collection = db["wishlists"]
review_collection = db["reviews"]
store_details_collection = db["storedetails"]