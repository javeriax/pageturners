from flask import Blueprint, request, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity
from bson import ObjectId
from datetime import datetime

library_bp = Blueprint('library', __name__, url_prefix='/api/library')


# helpers
# to avoid repeating code for db connection, id conversion, and fetching library entries
def get_db():
    db = current_app.db
    if db is None:
        return None, ({"success": False, "message": "Database connection failed"}, 500)
    return db, None

# helper to convert string id to ObjectId with error handling
def to_object_id(id_str, field_name="ID"):
    try:
        return ObjectId(id_str), None
    except:
        return None, ({"success": False, "message": f"Invalid {field_name} format"}, 400)

# helper to fetch library entry for a user and book
def get_library_entry(db, user_id, book_obj_id):
    return db["user_library"].find_one({
        "user_id": ObjectId(user_id),
        "book_id": book_obj_id
    })


# ADD BOOK
@library_bp.route('/add', methods=['POST'])
@jwt_required()
def add_to_library():
    try:
        user_id = get_jwt_identity()
        db, err = get_db()
        if err:
            return err

        data = request.get_json()
        book_id = data.get('book_id', '').strip()

        if not book_id:
            return {"success": False, "message": "Book ID is required"}, 400

        book_obj_id, err = to_object_id(book_id, "book ID")
        if err:
            return err

        # check book exists
        book = db["books"].find_one({"_id": book_obj_id})
        if not book:
            return {"success": False, "message": "Book not found"}, 404

        # check duplicate
        if get_library_entry(db, user_id, book_obj_id):
            return {"success": False, "message": "Book is already in your library"}, 409

        entry = {
            "user_id": ObjectId(user_id),
            "book_id": book_obj_id,
            "added_at": datetime.utcnow(),
            "status": "want to read",
            "current_page": 0
        }

        result = db["user_library"].insert_one(entry)

        return {
            "success": True,
            "message": "Book added to library successfully",
            "data": {
                "library_id": str(result.inserted_id),
                "book_id": book_id,
                "status": "want to read",
                "current_page": 0
            }
        }, 201

    except Exception as e:
        print(f"add error: {e}")
        return {"success": False, "message": str(e)}, 500


# GET LIBRARY
@library_bp.route('/', methods=['GET'])
@jwt_required()
def get_user_library():
    try:
        user_id = get_jwt_identity()
        db, err = get_db()
        if err:
            return err

        status = request.args.get('status', '').strip()
        page = max(int(request.args.get('page', 1)), 1)
        limit = int(request.args.get('limit', 12))

        filter_query = {"user_id": ObjectId(user_id)}
        if status in ["want to read", "currently reading", "completed", "dropped"]:
            filter_query["status"] = status

        library_collection = db["user_library"]
        books_collection = db["books"]

        total = library_collection.count_documents(filter_query)

        entries = list(
            library_collection
            .find(filter_query)
            .sort("added_at", -1)
            .skip((page - 1) * limit)
            .limit(limit)
        )

        books_data = []
        for entry in entries:
            book = books_collection.find_one({"_id": entry["book_id"]})
            if not book:
                continue

            book['_id'] = str(book['_id'])
            book['library_id'] = str(entry['_id'])
            book['status'] = entry['status']
            book['current_page'] = entry.get('current_page', 0)
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
        print(f"fetch error: {e}")
        return {"success": False, "message": str(e)}, 500


# REMOVE BOOK
@library_bp.route('/<book_id>', methods=['DELETE'])
@jwt_required()
def remove_from_library(book_id):
    try:
        user_id = get_jwt_identity()
        db, err = get_db()
        if err:
            return err

        book_obj_id, err = to_object_id(book_id, "book ID")
        if err:
            return err

        entry = get_library_entry(db, user_id, book_obj_id)
        if not entry:
            return {"success": False, "message": "Book not found in your library"}, 404

        db["user_library"].delete_one({
            "user_id": ObjectId(user_id),
            "book_id": book_obj_id
        })

        return {
            "success": True,
            "message": "Book removed from library successfully"
        }, 200

    except Exception as e:
        print(f"remove error: {e}")
        return {"success": False, "message": str(e)}, 500


# UPDATE STATUS
@library_bp.route('/<book_id>/status', methods=['PATCH'])
@jwt_required()
def update_library_status(book_id):
    try:
        user_id = get_jwt_identity()
        db, err = get_db()
        if err:
            return err

        book_obj_id, err = to_object_id(book_id, "book ID")
        if err:
            return err

        data = request.get_json()
        status = data.get('status', '').strip()

        valid_status = ["want to read", "currently reading", "completed", "dropped"]
        if status not in valid_status:
            return {"success": False, "message": "Invalid status"}, 400

        entry = get_library_entry(db, user_id, book_obj_id)
        if not entry:
            return {"success": False, "message": "Book not found in your library"}, 404

        db["user_library"].update_one(
            {"_id": entry["_id"]},
            {"$set": {"status": status, "updated_at": datetime.utcnow()}}
        )

        return {
            "success": True,
            "message": "Book status updated successfully",
            "data": {"book_id": book_id, "status": status}
        }, 200

    except Exception as e:
        print(f"status error: {e}")
        return {"success": False, "message": str(e)}, 500


# UPDATE PROGRESS
@library_bp.route('/<book_id>/progress', methods=['PATCH'])
@jwt_required()
def update_progress(book_id):
    try:
        user_id = get_jwt_identity()
        db, err = get_db()
        if err:
            return err

        book_obj_id, err = to_object_id(book_id, "book ID")
        if err:
            return err

        data = request.get_json()
        new_page = data.get('current_page')

        book = db["books"].find_one({"_id": book_obj_id})
        if not book:
            return {"success": False, "message": "Book not found"}, 404

        total_pages = book.get('total_pages', 0)

        if (
            new_page is None or
            not isinstance(new_page, int) or
            new_page < 0 or
            new_page > total_pages
        ):
            return {"success": False, "message": "Valid page number is required"}, 400

        result = db["user_library"].update_one(
            {
                "user_id": ObjectId(user_id),
                "book_id": book_obj_id
            },
            {
                "$set": {
                    "current_page": new_page,
                    "updated_at": datetime.utcnow()
                }
            }
        )

        if result.matched_count == 0:
            return {"success": False, "message": "Book not found in your library"}, 404

        return {
            "success": True,
            "message": "Progress updated successfully",
            "data": {
                "current_page": new_page,
                "total_pages": total_pages
            }
        }, 200

    except Exception as e:
        print(f"progress error: {e}")
        return {"success": False, "message": str(e)}, 500