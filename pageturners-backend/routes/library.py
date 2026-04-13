from flask import Blueprint, request, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity
from bson import ObjectId
from datetime import datetime

library_bp = Blueprint('library', __name__, url_prefix='/api/library')


# ADD BOOK TO LIBRARY ENDPOINT
@library_bp.route('/add', methods=['POST'])
@jwt_required()
def add_to_library():
    """
    Add a book to user's personal library
    
    Expected JSON body:
    {
        "book_id": "60d5ec49c1234567890abcde"
    }
    """
    try:
        user_id = get_jwt_identity()
        db = current_app.db
        
        if db is None:
            return {"success": False, "message": "Database connection failed"}, 500
        
        # Get request data
        data = request.get_json()
        book_id = data.get('book_id', '').strip()
        
        # Validate book_id
        if not book_id:
            return {"success": False, "message": "Book ID is required"}, 400
        
        try:
            book_obj_id = ObjectId(book_id)
        except:
            return {"success": False, "message": "Invalid book ID format"}, 400
        
        # Check if book exists
        books_collection = db["books"]
        book = books_collection.find_one({"_id": book_obj_id})
        
        if not book:
            return {"success": False, "message": "Book not found"}, 404
        
        # Get user's library collection
        library_collection = db["user_library"]
        
        # Check if book is already in user's library
        existing = library_collection.find_one({
            "user_id": ObjectId(user_id),
            "book_id": book_obj_id
        })
        
        if existing:
            return {"success": False, "message": "Book is already in your library"}, 409
        
        # Create library entry
        library_entry = {
            "user_id": ObjectId(user_id),
            "book_id": book_obj_id,
            "added_at": datetime.utcnow(),
            "status": "want to read"  # Status: want to read, currently reading, completed, dropped
        }
        
        # Insert into library
        result = library_collection.insert_one(library_entry)
        
        return {
            "success": True,
            "message": "Book added to library successfully",
            "data": {
                "library_id": str(result.inserted_id),
                "book_id": book_id,
                "status": "want to read"
            }
        }, 201
    
    except Exception as e:
        print(f"Error adding book to library: {e}")
        return {"success": False, "message": str(e)}, 500


# GET USER'S LIBRARY ENDPOINT
@library_bp.route('/', methods=['GET'])
@jwt_required()
def get_user_library():
    """
    Fetch all books in user's library with full book details
    
    Query parameters:
    - status: filter by status (want to read, currently reading, completed, dropped) - optional
    - page: page number for pagination (default: 1)
    - limit: books per page (default: 12)
    """
    try:
        user_id = get_jwt_identity()
        db = current_app.db
        
        if db is None:
            return {"success": False, "message": "Database connection failed"}, 500
        
        # Get query parameters
        status = request.args.get('status', '').strip()
        page = int(request.args.get('page', 1))
        limit = int(request.args.get('limit', 12))
        
        if page < 1:
            page = 1
        
        library_collection = db["user_library"]
        books_collection = db["books"]
        
        # Build filter query
        filter_query = {"user_id": ObjectId(user_id)}
        if status and status in ["want to read", "currently reading", "completed", "dropped"]:
            filter_query["status"] = status
        
        # Get total count
        total = library_collection.count_documents(filter_query)
        
        # Get paginated library entries
        skip = (page - 1) * limit
        library_entries = list(
            library_collection
            .find(filter_query)
            .sort("added_at", -1)
            .skip(skip)
            .limit(limit)
        )
        
        # Fetch book details for each library entry
        books_data = []
        for entry in library_entries:
            book = books_collection.find_one({"_id": entry["book_id"]})
            if book:
                book['_id'] = str(book['_id'])
                book['library_id'] = str(entry['_id'])
                book['status'] = entry['status']
                book['added_at'] = entry['added_at'].isoformat()
                books_data.append(book)
        
        return {
            "success": True,
            "data": books_data,
            "pagination": {
                "page": page,
                "limit": limit,
                "total": total,
                "pages": (total + limit - 1) // limit
            }
        }, 200
    
    except Exception as e:
        print(f"Error fetching user library: {e}")
        return {"success": False, "message": str(e)}, 500


# REMOVE BOOK FROM LIBRARY ENDPOINT
@library_bp.route('/<book_id>', methods=['DELETE'])
@jwt_required()
def remove_from_library(book_id):
    """
    Remove a book from user's library
    """
    try:
        user_id = get_jwt_identity()
        db = current_app.db
        
        if db is None:
            return {"success": False, "message": "Database connection failed"}, 500
        
        try:
            book_obj_id = ObjectId(book_id)
        except:
            return {"success": False, "message": "Invalid book ID format"}, 400
        
        library_collection = db["user_library"]
        
        # Find the library entry
        library_entry = library_collection.find_one({
            "user_id": ObjectId(user_id),
            "book_id": book_obj_id
        })
        
        if not library_entry:
            return {"success": False, "message": "Book not found in your library"}, 404
        
        # Check ownership (verify it's user's entry)
        if str(library_entry["user_id"]) != str(user_id):
            return {"success": False, "message": "You can only delete your own library entries"}, 403
        
        # Delete the library entry
        library_collection.delete_one({
            "user_id": ObjectId(user_id),
            "book_id": book_obj_id
        })
        
        return {
            "success": True,
            "message": "Book removed from library successfully"
        }, 200
    
    except Exception as e:
        print(f"Error removing book from library: {e}")
        return {"success": False, "message": str(e)}, 500


# UPDATE LIBRARY ENTRY STATUS ENDPOINT (Bonus: for marking books as reading/completed)
@library_bp.route('/<book_id>/status', methods=['PATCH'])
@jwt_required()
def update_library_status(book_id):
    """
    Update reading status of a book in user's library
    
    Expected JSON body:
    {
        "status": "want to read" or "currently reading" or "completed" or "dropped"
    }
    """
    try:
        user_id = get_jwt_identity()
        db = current_app.db
        
        if db is None:
            return {"success": False, "message": "Database connection failed"}, 500
        
        try:
            book_obj_id = ObjectId(book_id)
        except:
            return {"success": False, "message": "Invalid book ID format"}, 400
        
        # Get request data
        data = request.get_json()
        status = data.get('status', '').strip()
        
        # Validate status
        if status not in ["want to read", "currently reading", "completed", "dropped"]:
            return {"success": False, "message": "Invalid status. Must be: want to read, currently reading, completed, or dropped"}, 400
        
        library_collection = db["user_library"]
        
        # Find the library entry
        library_entry = library_collection.find_one({
            "user_id": ObjectId(user_id),
            "book_id": book_obj_id
        })
        
        if not library_entry:
            return {"success": False, "message": "Book not found in your library"}, 404
        
        # Update status
        library_collection.update_one(
            {
                "user_id": ObjectId(user_id),
                "book_id": book_obj_id
            },
            {
                "$set": {
                    "status": status,
                    "updated_at": datetime.utcnow()
                }
            }
        )
        
        return {
            "success": True,
            "message": "Book status updated successfully",
            "data": {
                "book_id": book_id,
                "status": status
            }
        }, 200
    
    except Exception as e:
        print(f"Error updating library status: {e}")
        return {"success": False, "message": str(e)}, 500
