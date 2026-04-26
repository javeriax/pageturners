import requests
from pymongo import MongoClient
from dotenv import load_dotenv
import os

load_dotenv()
client = MongoClient(os.getenv("MONGO_URI"))
db = client["pageturners"]
books_collection = db["books"]

genres = [
    "fantasy", "romance", "thriller", "science fiction", "mystery",
    "horror", "biography", "history", "adventure", "comedy",
    "crime", "drama", "poetry", "self help", "philosophy",
    "psychology", "science", "travel", "cooking", "art",
    "religion", "politics", "economics", "technology", "education",
    "children", "young adult", "graphic novel", "short stories", "classic"
]

inserted = 0
skipped = 0

for genre in genres:
    print(f"\nFetching genre: {genre}")
    for start in [0, 40]:
        url = f"https://www.googleapis.com/books/v1/volumes?q=subject:{genre}&maxResults=40&startIndex={start}"
        response = requests.get(url)
        data = response.json()

        for item in data.get("items", []):
            info = item.get("volumeInfo", {})

            # skip books missing important fields
            if not info.get("title"):
                continue
            if not info.get("authors"):
                continue
            if not info.get("imageLinks", {}).get("thumbnail"):
                continue
            if not info.get("pageCount",0):
                continue
            book = {
                "title": info.get("title", "Unknown"),
                "author_name": ", ".join(info.get("authors", ["Unknown"])),
                "synopsis": info.get("description", ""),
                "genre": genre.capitalize(),
                "total_pages": info.get("pageCount", 0),
                "release_date": info.get("publishedDate", ""),
                "cover_image": info.get("imageLinks", {}).get("thumbnail", ""),
                "avg_rating": None
            }

            if not books_collection.find_one({"title": book["title"]}):
                books_collection.insert_one(book)
                inserted += 1
                print(f"Inserted: {book['title']}")
            else:
                skipped += 1

print(f"\nDone! Inserted: {inserted} books. Skipped {skipped} duplicates.")