from flask import Blueprint, request, current_app
from flask_jwt_extended import jwt_required
import os

dashboard_bp = Blueprint('dashboard', __name__, url_prefix='/api/dashboard')

# INITIAL BOOKS ENDPOINT 
@dashboard_bp.route('/initial', methods=['GET'])
@jwt_required()
def get_initial_books():
    """Fetch initial 3 rows of books for dashboard with sorting"""
    try:
        db = current_app.db
        if db is None:
            return {"success": False, "message": "Database connection failed"}, 500
        
        books_collection = db["books"]
        
        # Row 1: Popular Picks
        popular_pipeline = [
            {
                "$lookup": {
                    "from": "reviews",
                    "localField": "_id",
                    "foreignField": "book_id",
                    "as": "reviews"
                }
            },
            {
                "$addFields": {
                    "review_count": {"$size": "$reviews"},
                    "avg_rating": {
                        "$cond": [
                            {"$gt": [{"$size": "$reviews"}, 0]},
                            {"$avg": "$reviews.rating"},
                            0
                        ]
                    }
                }
            },
            {"$match": {"review_count": {"$gt": 0}}},
            {"$sort": {"review_count": -1, "avg_rating": -1}},
            {"$limit": 20},
            {
                "$project": {
                    "reviews": 0  
                }
            }
        ]
        row1 = list(books_collection.aggregate(popular_pipeline))
        
        # Row 2: New Arrivals 
        try:
            row2 = list(books_collection.find()
                       .sort([("created_at", -1)])
                       .limit(20))
        except:
            row2 = list(books_collection.find()
                       .sort([("_id", -1)])
                       .limit(20))
        
        # Row 3: More to Explore 
        total_count = books_collection.count_documents({})
        if total_count > 0:
            random_pipeline = [{"$sample": {"size": min(20, total_count)}}]
            row3 = list(books_collection.aggregate(random_pipeline))
        else:
            row3 = []
        
        # Convert all ObjectId fields to strings for JSON serialization
        def convert_objectids(obj):
            from bson import ObjectId
            if isinstance(obj, list):
                return [convert_objectids(item) for item in obj]
            elif isinstance(obj, dict):
                return {k: str(v) if isinstance(v, ObjectId) else convert_objectids(v) 
                        for k, v in obj.items()}
            return obj
        
        row1 = convert_objectids(row1)
        row2 = convert_objectids(row2)
        row3 = convert_objectids(row3)
        
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
@dashboard_bp.route('/genres', methods=['GET'])
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
@dashboard_bp.route('/', methods=['GET'])
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