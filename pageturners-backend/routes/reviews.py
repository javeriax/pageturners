from flask import Blueprint, request, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity
from bson import ObjectId
from datetime import datetime, timezone

reviews_bp = Blueprint('reviews', __name__, url_prefix='/api/books')

#  HELPERS 

def get_db():
    return current_app.db

def err(message, status=400):
    return {"success": False, "message": message}, status

def ok(message, data=None, status=200):
    response = {"success": True, "message": message}
    if data is not None:
        response["data"] = data
    return response, status

def recalculate_avg(reviews_collection, books_collection, book_id):
    """Recalculate and update avg_rating and review_count for a book"""
    remaining = list(reviews_collection.find({"book_id": ObjectId(book_id)}))
    if remaining:
        avg = round(sum(r.get("rating", 0) for r in remaining) / len(remaining), 1)
        count = len(remaining)
    else:
        avg, count = 0, 0
    books_collection.update_one(
        {"_id": ObjectId(book_id)},
        {"$set": {"avg_rating": avg, "review_count": count}}
    )
    return avg, count

def validate_review(data):
    """Returns (rating, review_text, error) tuple"""
    review_text = data.get('review_text', '').strip()
    if not review_text:
        return None, None, err("Review text is required and cannot be empty")

    rating = data.get('rating')
    if not rating:
        return None, None, err("Rating is required")
    if not isinstance(rating, int) or rating < 1 or rating > 5:
        return None, None, err("Rating must be between 1 and 5")

    return rating, review_text, None

def serialize_review(review):
    review['_id'] = str(review['_id'])
    review['user_id'] = str(review['user_id'])
    review['created_at'] = review['created_at'].isoformat()
    return review

#  ROUTES 

@reviews_bp.route('/<book_id>/reviews', methods=['POST'])
@jwt_required()
def submit_review(book_id):
    try:
        user_id = get_jwt_identity()
        db = get_db()
        if db is None:
            return err("Database connection failed", 500)

        rating, review_text, error = validate_review(request.get_json())
        if error:
            return error

        books_collection = db["books"]
        book = books_collection.find_one({"_id": ObjectId(book_id)})
        if not book:
            return err("Book not found", 404)

        user = db["users"].find_one({"_id": ObjectId(user_id)})
        username = user.get('username', 'Anonymous') if user else 'Anonymous'

        now = datetime.now(timezone.utc)
        review_doc = {
            "user_id": ObjectId(user_id),
            "username": username,
            "rating": rating,
            "book_id": ObjectId(book_id),
            "review_text": review_text,
            "created_at": now,
            "updated_at": now
        }

        reviews_collection = db["reviews"]
        result = reviews_collection.insert_one(review_doc)
        avg, count = recalculate_avg(reviews_collection, books_collection, book_id)

        return ok("Review submitted successfully", {
            "review_id": str(result.inserted_id),
            "rating": rating,
            "review_text": review_text,
            "username": username,
            "created_at": now.isoformat(),
            "avg_rating": avg,
            "review_count": count
        }, 201)

    except Exception as e:
        print(f"Error submitting review: {e}")
        return err(str(e), 500)


@reviews_bp.route('/<book_id>/reviews', methods=['GET'])
@jwt_required()
def get_book_reviews(book_id):
    try:
        db = get_db()
        if db is None:
            return err("Database connection failed", 500)

        book = db["books"].find_one({"_id": ObjectId(book_id)})
        if not book:
            return err("Book not found", 404)

        reviews = [serialize_review(r) for r in db["reviews"].find({"book_id": ObjectId(book_id)})]

        return ok("Reviews fetched", {
            "avg_rating": book.get('avg_rating', 0),
            "review_count": book.get('review_count', 0),
            "reviews": reviews
        })

    except Exception as e:
        print(f"Error fetching reviews: {e}")
        return err(str(e), 500)


@reviews_bp.route('/<book_id>/reviews/<review_id>', methods=['DELETE'])
@jwt_required()
def delete_review(book_id, review_id):
    try:
        user_id = get_jwt_identity()
        db = get_db()

        reviews_collection = db["reviews"]
        review = reviews_collection.find_one({"_id": ObjectId(review_id)})

        if not review:
            return err("Review not found", 404)
        if str(review["user_id"]) != str(user_id):
            return err("You can only delete your own reviews", 403)

        reviews_collection.delete_one({"_id": ObjectId(review_id)})
        avg, count = recalculate_avg(reviews_collection, db["books"], book_id)

        return ok("Review deleted successfully", {
            "new_avg_rating": avg,
            "review_count": count
        })

    except Exception as e:
        print(f"Error deleting review: {e}")
        return err(str(e), 500)