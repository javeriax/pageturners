# UC12: User Profile Management - handles profile updates, password changes, picture uploads
# FR6, FR7, FR8: Profile data, password management, picture uploads

from flask import Blueprint, request, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity
from bson import ObjectId
from datetime import datetime
import bcrypt
import base64
import re

profile_bp = Blueprint('profile', __name__, url_prefix='/api/profile')

# Helper function to validate email format
def is_valid_email(email):
    """FR7.2: Validate email format"""
    pattern = r'^[^\s@]+@[^\s@]+\.[^\s@]+$'
    return re.match(pattern, email) is not None

# Helper function to validate file type
def is_valid_image(base64_str):
    """FR8: Validate image file type from base64 string"""
    # Check for data:image/jpeg;base64, data:image/png;base64, etc.
    if base64_str.startswith('data:image/jpeg;base64,') or base64_str.startswith('data:image/jpg;base64,'):
        return True, 'jpeg'
    elif base64_str.startswith('data:image/png;base64,'):
        return True, 'png'
    return False, None

# Helper function to store image
def store_image(base64_str, user_id):
    """FR8: Store uploaded image and return URL"""
    import os
    import hashlib
    
    # Create uploads directory if it doesn't exist
    upload_dir = 'uploads/profile_pictures'
    os.makedirs(upload_dir, exist_ok=True)
    
    # Remove data URI prefix
    if ',' in base64_str:
        base64_str = base64_str.split(',')[1]
    
    # Decode base64
    try:
        image_data = base64.b64decode(base64_str)
    except Exception:
        return None
    
    # Generate filename
    hash_name = hashlib.md5(f"{user_id}{datetime.utcnow().timestamp()}".encode()).hexdigest()
    file_ext = 'jpg' if 'jpeg' in base64_str or 'jpg' in base64_str else 'png'
    filename = f"{hash_name}.{file_ext}"
    
    # Save file
    filepath = os.path.join(upload_dir, filename)
    try:
        with open(filepath, 'wb') as f:
            f.write(image_data)
        return f"/uploads/profile_pictures/{filename}"
    except Exception:
        return None


# FR6: GET /api/profile - Fetch current user's profile data
@profile_bp.route('', methods=['GET'])
@jwt_required()
def get_profile():
    """
    Fetch current user's profile including bio, username, email, and profile picture
    """
    try:
        user_id = get_jwt_identity()
        db = current_app.db
        
        if db is None:
            return {"success": False, "message": "Database connection failed"}, 500
        
        users_collection = db["users"]
        user = users_collection.find_one({"_id": ObjectId(user_id)})
        
        if not user:
            return {"success": False, "message": "User not found"}, 404
        
        # Get profile picture with full URL
        profile_pic = user.get("profile_picture", "")
        if profile_pic and not profile_pic.startswith('http'):
            # Add backend URL prefix if it's a relative path
            profile_pic = f"http://localhost:5001{profile_pic}"
        
        # FR6: Return profile fields
        return {
            "success": True,
            "data": {
                "user_id": str(user["_id"]),
                "username": user.get("username", ""),
                "email": user.get("email", ""),
                "bio": user.get("bio", ""),
                "profile_picture": profile_pic  # ← Now includes full URL
            }
        }, 200
    
    except Exception as e:
        print(f"Error fetching profile: {e}")
        return {"success": False, "message": str(e)}, 500
    
# FR6.2: PATCH /api/profile - Update profile (bio, username, email)
@profile_bp.route('', methods=['PATCH'])
@jwt_required()
def update_profile():
    """
    Update user profile fields (bio, username, email)
    Supports partial updates - only provided fields are updated
    
    Request body:
    {
        "bio": "string (optional)",
        "username": "string (optional)",
        "email": "string (optional)"
    }
    
    Returns:
        200: Profile updated successfully
        400: Invalid input (bad email format, etc)
        409: Username already taken
        401: Unauthorized (token invalid/expired)
    """
    try:
        user_id = get_jwt_identity()
        db = current_app.db
        
        if db is None:
            return {"success": False, "message": "Database connection failed"}, 500
        
        data = request.get_json()
        users_collection = db["users"]
        
        update_data = {}
        
        # FR6.2: Update bio if provided
        if "bio" in data:
            update_data["bio"] = data["bio"].strip()
        
        # FR6.2: Update username if provided
        if "username" in data:
            new_username = data["username"].strip()
            
            # FR7.1: Check if username is already taken
            existing_user = users_collection.find_one(
                {"username": new_username, "_id": {"$ne": ObjectId(user_id)}}
            )
            
            if existing_user:
                return {
                    "success": False,
                    "message": "Username already taken"
                }, 409
            
            update_data["username"] = new_username
        
        # FR6.2: Update email if provided
        if "email" in data:
            new_email = data["email"].strip()
            
            # FR7.2: Validate email format
            if not is_valid_email(new_email):
                return {
                    "success": False,
                    "message": "Invalid email format"
                }, 400
            
            # Check if email is already taken
            existing_user = users_collection.find_one(
                {"email": new_email, "_id": {"$ne": ObjectId(user_id)}}
            )
            
            if existing_user:
                return {
                    "success": False,
                    "message": "Email already registered"
                }, 409
            
            update_data["email"] = new_email
            # FR6.3: Mark email as unverified (requires verification)
            update_data["is_verified"] = False
            update_data["verification_code"] = "PENDING"
        
        if not update_data:
            return {
                "success": False,
                "message": "No fields to update"
            }, 400
        
        # FR6.2: API - Confirm partial updates work correctly
        users_collection.update_one(
            {"_id": ObjectId(user_id)},
            {"$set": update_data}
        )
        
        # After updating, fetch updated user
        updated_user = users_collection.find_one({"_id": ObjectId(user_id)})

        # Get profile picture with full URL
        profile_pic = updated_user.get("profile_picture", "")
        if profile_pic and not profile_pic.startswith('http'):
            profile_pic = f"http://localhost:5001{profile_pic}"

        return {
            "success": True,
            "message": "Profile updated successfully",
            "data": {
                "user_id": str(updated_user["_id"]),
                "username": updated_user.get("username", ""),
                "email": updated_user.get("email", ""),
                "bio": updated_user.get("bio", ""),
                "profile_picture": profile_pic  # ← Add full URL here too
            }
        }, 200
    
    except Exception as e:
        print(f"Error updating profile: {e}")
        return {"success": False, "message": str(e)}, 500


# FR7.3: POST /api/profile/password - Change password
@profile_bp.route('/password', methods=['POST'])
@jwt_required()
def change_password():
    """
    Change user's password
    Requires valid current password before allowing change
    
    Request body:
    {
        "current_password": "string",
        "new_password": "string (minimum 8 characters)"
    }
    
    Returns:
        200: Password changed successfully
        400: Current password incorrect or new password invalid
        401: Unauthorized (token invalid/expired)
    """
    try:
        user_id = get_jwt_identity()
        db = current_app.db
        
        if db is None:
            return {"success": False, "message": "Database connection failed"}, 500
        
        data = request.get_json()
        current_password = data.get("current_password")
        new_password = data.get("new_password")
        
        if not current_password or not new_password:
            return {
                "success": False,
                "message": "Current password and new password are required"
            }, 400
        
        # FR7.3: Validate new password minimum length
        if len(new_password) < 8:
            return {
                "success": False,
                "message": "New password must be at least 8 characters"
            }, 400
        
        users_collection = db["users"]
        user = users_collection.find_one({"_id": ObjectId(user_id)})
        
        if not user:
            return {"success": False, "message": "User not found"}, 404
        
        # FR7.3: Validate current password matches
        if not bcrypt.checkpw(current_password.encode('utf-8'), user["password"]):
            return {
                "success": False,
                "message": "Current password is incorrect"
            }, 400
        
        # Hash new password
        hashed_password = bcrypt.hashpw(new_password.encode('utf-8'), bcrypt.gensalt())
        
        # Update password
        users_collection.update_one(
            {"_id": ObjectId(user_id)},
            {"$set": {"password": hashed_password}}
        )
        
        return {
            "success": True,
            "message": "Password changed successfully"
        }, 200
    
    except Exception as e:
        print(f"Error changing password: {e}")
        return {"success": False, "message": str(e)}, 500


# FR8: POST /api/profile/picture - Upload profile picture
@profile_bp.route('/picture', methods=['POST'])
@jwt_required()
def upload_profile_picture():
    """
    Upload and store user's profile picture
    Accepts base64 encoded image
    
    Request body:
    {
        "image": "data:image/jpeg;base64,..."
    }
    
    Returns:
        200: Picture uploaded successfully with new URL
        400: Invalid file type (only JPG/PNG/JPEG allowed)
        401: Unauthorized (token invalid/expired)
    """
    try:
        user_id = get_jwt_identity()
        db = current_app.db
        
        if db is None:
            return {"success": False, "message": "Database connection failed"}, 500
        
        data = request.get_json()
        image_base64 = data.get("image")
        
        if not image_base64:
            return {
                "success": False,
                "message": "Image is required"
            }, 400
        
        # FR8: Validate image file type
        is_valid, file_type = is_valid_image(image_base64)
        
        if not is_valid:
            return {
                "success": False,
                "message": "Only JPG/PNG/JPEG files allowed"
            }, 400
        
        # FR8: Store image and get URL
        picture_url = store_image(image_base64, user_id)
        
        if not picture_url:
            return {
                "success": False,
                "message": "Failed to save image"
            }, 500
        
        # Update user profile picture URL
        users_collection = db["users"]
        users_collection.update_one(
            {"_id": ObjectId(user_id)},
            {"$set": {"profile_picture": picture_url}}
        )
        
        return {
            "success": True,
            "message": "Profile picture uploaded successfully",
            "data": {
                "profile_picture": picture_url
            }
        }, 200
    
    except Exception as e:
        print(f"Error uploading picture: {e}")
        return {"success": False, "message": str(e)}, 500