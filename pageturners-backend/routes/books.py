from flask import Blueprint, current_app
from flask_jwt_extended import jwt_required
from bson import ObjectId

books_bp = Blueprint('books', __name__, url_prefix='/api/books')

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