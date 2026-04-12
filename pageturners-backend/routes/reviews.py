from flask import Blueprint, request, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity
from bson import ObjectId
from datetime import datetime


reviews_bp = Blueprint('reviews', __name__, url_prefix='/api/books')



# SUBMIT REVIEW ENDPOINT (KLYRA-82: Create POST endpoint)
@reviews_bp.route('/<book_id>/reviews', methods=['POST'])
@jwt_required()
def submit_review(book_id):
    """
    Submit a review for a book
    
    Expected JSON body:
    {
        "rating": 5,
        "review_text": "Great book!"
    }
    """
    try:
        # Get user ID from JWT token (KLYRA-87: JWT authentication check)
        user_id = get_jwt_identity()
        
        db = current_app.db
        if db is None:
            return {"success": False, "message": "Database connection failed"}, 500
        
        # Get request data
        data = request.get_json()
        rating = data.get('rating')
        review_text = data.get('review_text', '').strip()
        
        # VALIDATION (KLYRA-87: Validate rating is 1-5, required fields)
        if not rating:
            return {"success": False, "message": "Rating is required"}, 400
        
        if not isinstance(rating, int) or rating < 1 or rating > 5:
            return {"success": False, "message": "Rating must be between 1 and 5"}, 400
        
        if not review_text:
            return {"success": False, "message": "Review text cannot be empty"}, 400
        
        # Check if book exists
        books_collection = db["books"]
        book = books_collection.find_one({"_id": ObjectId(book_id)})
        
        if not book:
            return {"success": False, "message": "Book not found"}, 404
        
        # Get user details for review display
        users_collection = db["users"]
        user = users_collection.find_one({"_id": ObjectId(user_id)})
        username = user.get('username', 'Anonymous') if user else 'Anonymous'
        
        # Create review document (KLYRA-80: Review schema)
        review_document = {
            "user_id": ObjectId(user_id),
            "username": username,
            "rating": rating,
            "book_id": ObjectId(book_id),
            "review_text": review_text,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
            
        }
        
        # Save review to database (KLYRA-83: Save to database)
        reviews_collection = db["reviews"]
        result = reviews_collection.insert_one(review_document)


        # Update book's review count and average rating (KLYRA-117: Calculate avg rating)
        current_reviews = list(reviews_collection.find({"book_id": ObjectId(book_id)}))
        all_ratings = [review.get('rating', 0) for review in current_reviews]
        
        avg_rating = sum(all_ratings) / len(all_ratings) if all_ratings else rating
        review_count = len(all_ratings)
        
        # Update book with new average and count
        books_collection.update_one(
            {"_id": ObjectId(book_id)},
            {
                "$set": {
                    "avg_rating": round(avg_rating, 1),
                    "review_count": review_count
                }
            }
        )
        
        return {
            "success": True,
            "message": "Review submitted successfully",
            "data": {
                "review_id": str(result.inserted_id),
                "rating": rating,
                "review_text": review_text,
                "username": username,
                "created_at": review_document["created_at"].isoformat(),
                "avg_rating": round(avg_rating, 1),
                "review_count": review_count
            }
        }, 201
    
    except Exception as e:
        print(f"Error submitting review: {e}")
        return {"success": False, "message": str(e)}, 500


# GET REVIEWS ENDPOINT (KLYRA-85: Fetch reviews for a book)
# @reviews_bp.route('/<book_id>/reviews', methods=['GET'])
# @jwt_required()
# def get_book_reviews(book_id):
#     """
#     Fetch all reviews for a specific book
#     """
#     try:
#         db = current_app.db
#         if db is None:
#             return {"success": False, "message": "Database connection failed"}, 500
        
#         # Check if book exists
#         books_collection = db["books"]
#         book = books_collection.find_one({"_id": ObjectId(book_id)})
        
#         if not book:
#             return {"success": False, "message": "Book not found"}, 404
        
#         # Fetch all reviews for this book
#         reviews_collection = db["reviews"]
#         # This is simplified - in real app, reviews should have book_id field
#         # For now, we'll assume reviews are linked by querying
        
#         return {
#             "success": True,
#             "data": {
#                 "avg_rating": book.get('avg_rating', 0),
#                 "review_count": book.get('review_count', 0),
#                 "reviews": book.get('reviews', [])
#             }
#         }, 200
    
#     except Exception as e:
#         print(f"Error fetching reviews: {e}")
#         return {"success": False, "message": str(e)}, 500
    
@reviews_bp.route('/<book_id>/reviews', methods=['GET'])
@jwt_required()
def get_book_reviews(book_id):
    """Fetch all reviews for a specific book"""
    try:
        db = current_app.db
        if db is None:
            return {"success": False, "message": "Database connection failed"}, 500
        
        # Check if book exists
        books_collection = db["books"]
        book = books_collection.find_one({"_id": ObjectId(book_id)})
        
        if not book:
            return {"success": False, "message": "Book not found"}, 404
        
        # ✅ Fetch from reviews collection, not from book document
        reviews_collection = db["reviews"]
        all_reviews = list(reviews_collection.find({"book_id": ObjectId(book_id)}))
        
        # Convert ObjectId to string for JSON serialization
        for review in all_reviews:
            review['_id'] = str(review['_id'])
            review['user_id'] = str(review['user_id'])
            review['created_at'] = review['created_at'].isoformat()
        
        return {
            "success": True,
            "data": {
                "avg_rating": book.get('avg_rating', 0),
                "review_count": book.get('review_count', 0),
                "reviews": all_reviews
            }
        }, 200
    
    except Exception as e:
        print(f"Error fetching reviews: {e}")
        return {"success": False, "message": str(e)}, 500
    
# DELETE REVIEW ENDPOINT (KLYRA-71, 72, 73, 74, 75, 76)
@reviews_bp.route('/<book_id>/reviews/<review_id>', methods=['DELETE'])
@jwt_required()
def delete_review(book_id, review_id):
    try:
        user_id = get_jwt_identity()
        db = current_app.db

        reviews_collection = db["reviews"]
        books_collection = db["books"]

        # Find the review
        review = reviews_collection.find_one({"_id": ObjectId(review_id)})

        if not review:
            return {"success": False, "message": "Review not found"}, 404

        # KLYRA-72 & 73: Check ownership
        if str(review["user_id"]) != str(user_id):
            return {"success": False, "message": "You can only delete your own reviews"}, 403

        # KLYRA-74: Delete the review
        reviews_collection.delete_one({"_id": ObjectId(review_id)})

        # KLYRA-75 & 76: Recalculate average rating from remaining reviews
        remaining_reviews = list(reviews_collection.find({"book_id": ObjectId(book_id)}))
        
        if remaining_reviews:
            all_ratings = [r.get("rating", 0) for r in remaining_reviews]
            new_avg = round(sum(all_ratings) / len(all_ratings), 1)
            new_count = len(all_ratings)
        else:
            new_avg = 0
            new_count = 0

        books_collection.update_one(
            {"_id": ObjectId(book_id)},
            {"$set": {"avg_rating": new_avg, "review_count": new_count}}
        )

        return {
            "success": True,
            "message": "Review deleted successfully",
            "data": {
                "new_avg_rating": new_avg,
                "review_count": new_count
            }
        }, 200

    except Exception as e:
        print(f"Error deleting review: {e}")
        return {"success": False, "message": str(e)}, 500