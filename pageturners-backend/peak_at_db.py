import os
from pymongo import MongoClient
from dotenv import load_dotenv
import json

load_dotenv()
uri = os.getenv("MONGO_URI")

client = MongoClient(uri)
db = client["pageturners"]

# Ask user what they want to display
print("What would you like to see in database_dump.txt?")
print("1. Users")
print("2. Books")
print("3. Both")

choice = input("Enter your choice (1/2/3): ").strip().lower()

with open("database_dump.txt", "w") as f:
    # Display Users
    if choice in ["1", "users", "both"]:
        users_collection = db["users"]
        all_users = list(users_collection.find({}))
        
        f.write("=" * 30 + "\n")
        f.write("USERS DATA\n")
        f.write("=" * 30 + "\n\n")
        f.write(f"TOTAL USERS FOUND: {len(all_users)}\n")
        f.write("-" * 30 + "\n\n")
        
        for user in all_users:
            if '_id' in user:
                user['_id'] = str(user['_id'])
            if 'password' in user:
                user['password'] = "***HASHED***"  # Don't display actual password hash
                
            f.write(json.dumps(user, indent=4, default=str))
            f.write("\n" + "-" * 20 + "\n")
        
        print(f"✓ Found {len(all_users)} users.")
    
    # Display Books
    if choice in ["2", "books", "both"]:
        if choice == "both":
            f.write("\n\n")
        
        books_collection = db["books"]
        all_books = list(books_collection.find({}))
        
        f.write("=" * 30 + "\n")
        f.write("BOOKS DATA\n")
        f.write("=" * 30 + "\n\n")
        f.write(f"TOTAL BOOKS FOUND: {len(all_books)}\n")
        f.write("-" * 30 + "\n\n")
        
        for book in all_books:
            if '_id' in book:
                book['_id'] = str(book['_id'])
                
            f.write(json.dumps(book, indent=4))
            f.write("\n" + "-" * 20 + "\n")
        
        print(f"✓ Found {len(all_books)} books.")

print("\nCheck 'database_dump.txt' to see the data.")