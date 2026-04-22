from flask import Blueprint, request, current_app
from flask_jwt_extended import jwt_required
from pymongo import MongoClient
import os
from dotenv import load_dotenv

load_dotenv()

books_bp = Blueprint('books', __name__, url_prefix='/api/books')

# Get database connection
# def get_db():
#     try:
#         client = MongoClient(os.getenv("MONGO_URI"), serverSelectionTimeoutMS=5000)
#         client.admin.command('ping')
#         return client["pageturners"]
#     except Exception as e:
#         print(f"Database connection error: {e}")
#         return None

# INITIAL BOOKS ENDPOINT
@books_bp.route('/initial', methods=['GET'])
@jwt_required()
def get_initial_books():
    """Fetch initial 3 rows of books for dashboard"""
    try:
        db = current_app.db
        if db is None:
            return {"success": False, "message": "Database connection failed"}, 500
        
        books_collection = db["books"]
        
        # Get 20 books for each row (3 rows total = 60 books)
        row1 = list(books_collection.find().limit(20))
        row2 = list(books_collection.find().skip(20).limit(20))
        row3 = list(books_collection.find().skip(40).limit(20))
        
        # Convert ObjectId to string for JSON serialization
        for row in [row1, row2, row3]:
            for book in row:
                book['_id'] = str(book['_id'])
        
        return {
            "success": True,
            "data": {
                "row1": row1,
                "row2": row2,
                "row3": row3
            }
        }, 200
    
    except Exception as e:
        print(f"Error fetching initial books: {e}")
        return {"success": False, "message": str(e), "data": {"row1": [], "row2": [], "row3": []}}, 500

# GENRES ENDPOINT
@books_bp.route('/genres', methods=['GET'])
@jwt_required()
def get_genres():
    """Fetch all available genres"""
    try:
        db = current_app.db
        if db is None:
            return {"success": False, "message": "Database connection failed"}, 500
        
        books_collection = db["books"]
        genres = books_collection.distinct("genre")
        genres = [g for g in genres if g]  # Remove None values
        genres.sort()
        
        return {"success": True, "data": genres}, 200
    
    except Exception as e:
        print(f"Error fetching genres: {e}")
        return {"success": False, "message": str(e), "data": []}, 500


# SEARCH AND FILTER ENDPOINT
@books_bp.route('/', methods=['GET'])
@jwt_required()
def search_books():
    """Search and filter books"""
    try:
        db = current_app.db
        if db is None:
            return {"success": False, "message": "Database connection failed"}, 500
        
        books_collection = db["books"]
        
        # Get query parameters
        search = request.args.get('search', '').strip()
        genres = request.args.get('genre', '')
        page = int(request.args.get('page', 1))
        limit = int(request.args.get('limit', 12))
        
        # Build filter
        filter_query = {}
        
        if search:
            filter_query["$or"] = [
                {"title": {"$regex": search, "$options": "i"}},
                {"author_name": {"$regex": search, "$options": "i"}}
            ]
        
        if genres:
            genre_list = [g.strip() for g in genres.split(',')]
            filter_query["genre"] = {"$all": genre_list}
        
        # Get total count
        total = books_collection.count_documents(filter_query)
        
        # Get paginated results
        skip = (page - 1) * limit
        books = list(books_collection.find(filter_query).skip(skip).limit(limit))
        
        # Convert ObjectId to string
        for book in books:
            book['_id'] = str(book['_id'])
        
        return {
            "success": True,
            "data": books,
            "pagination": {
                "page": page,
                "limit": limit,
                "total": total,
                "pages": (total + limit - 1) // limit
            }
        }, 200
    
    except Exception as e:
        print(f"Error searching books: {e}")
        return {"success": False, "message": str(e), "data": []}, 500


from bson import ObjectId # we need this to search by ID

# BOOK DETAILS ENDPOINT
@books_bp.route('/<book_id>', methods=['GET'])
@jwt_required()
def get_book_details(book_id):
    try:
        db = current_app.db
        if db is None:
            return {"success": False, "message": "Database connection failed"}, 500
        
        # Convert the string ID from the URL into a MongoDB ObjectId
        book = db["books"].find_one({"_id": ObjectId(book_id)})
        
        if not book:
            return {"success": False, "message": "Book not found"}, 404
            
        # Fetch reviews for this book from the reviews collection
        reviews_cursor = db["reviews"].find({"book_id": ObjectId(book_id)})
        reviews_list = []
        for review in reviews_cursor:
            reviews_list.append({
                "review_id": str(review["_id"]),
                "username": review.get("username", "Anonymous"),
                "user_id": str(review["user_id"]),
                "rating": review.get("rating"),
                "review_text": review.get("review_text", ""),
                "created_at": review["created_at"].isoformat() if review.get("created_at") else None
            })
        book['reviews'] = reviews_list
        
        book['_id'] = str(book['_id'])  # Convert ObjectId to string for JSON
        
        return {"success": True, "data": book}, 200
    except Exception as e:
        return {"success": False, "message": str(e)}, 500