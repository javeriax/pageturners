from flask import Blueprint, current_app
from flask_jwt_extended import jwt_required
from bson import ObjectId
from bson.errors import InvalidId

#blueprint for book-related routes:
books_bp = Blueprint('books', __name__, url_prefix='/api/books')

# BOOK DETAILS ENDPOINT:
@books_bp.route('/<book_id>', methods=['GET'])
@jwt_required()
def get_book_details(book_id):
    try:
        db = current_app.db
        if not db:
            return {"success": False, "message": "Database connection failed"}, 500

        # validate and convert id
        try:
            obj_id = ObjectId(book_id)
        except InvalidId:
            return {"success": False, "message": "Invalid book id"}, 400

        book = db["books"].find_one({"_id": obj_id})

        if not book:
            return {"success": False, "message": "Book not found"}, 404

        # fetch reviews
        reviews_cursor = db["reviews"].find({"book_id": obj_id})

        reviews = []
        for review in reviews_cursor:
            reviews.append({
                "review_id": str(review["_id"]),
                "username": review.get("username", "Anonymous"),
                "user_id": str(review["user_id"]),
                "rating": review.get("rating"),
                "review_text": review.get("review_text", ""),
                "created_at": review["created_at"].isoformat() if review.get("created_at") else None
            })

        # attach reviews and convert id
        book["reviews"] = reviews
        book["_id"] = str(book["_id"])

        return {"success": True, "data": book}, 200

    except Exception as e:
        print(f"get_book_details error: {e}")
        return {"success": False, "message": "Failed to fetch book details"}, 500