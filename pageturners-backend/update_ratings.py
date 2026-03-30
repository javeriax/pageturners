from pymongo import MongoClient
from dotenv import load_dotenv
import os

load_dotenv()
client = MongoClient(os.getenv("MONGO_URI"))
db = client["pageturners"]
books_collection = db["books"]

result = books_collection.update_many(
    {},  # matches all documents
    {"$set": {"avg_rating": None}}
)

print(f"Updated {result.modified_count} books to avg_rating: null")