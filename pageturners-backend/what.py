from pymongo import MongoClient
from dotenv import load_dotenv
import os

load_dotenv()
db = MongoClient(os.getenv("MONGO_URI"))["pageturners"]

result = db.books.delete_many({
    "$or": [
        {"cover_image": ""},
        {"cover_image": None},
        {"cover_image": {"$exists": False}}
    ]
})

print(f"Removed {result.deleted_count} books without covers")
print(f"Remaining books: {db.books.count_documents({})}")