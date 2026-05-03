# UC12: User Profile Management - handles profile updates, password changes, picture uploads
# FR6, FR7, FR8: Profile data, password management, picture uploads

from flask import Blueprint, request, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity
from bson import ObjectId
from datetime import datetime, timezone
import bcrypt
import base64
import re
import os
import hashlib
import secrets

profile_bp = Blueprint('profile', __name__, url_prefix='/api/profile')

#  CONSTANTS 

BACKEND_URL = "http://localhost:5001"
UPLOAD_DIR = 'uploads/profile_pictures'

#  HELPERS 

def is_valid_email(email):
    """FR7.2: Validate email format"""
    return re.match(r'^[^\s@]+@[^\s@]+\.[^\s@]+$', email) is not None

def is_valid_image(base64_str):
    """FR8: Validate image file type from base64 string"""
    if base64_str.startswith(('data:image/jpeg;base64,', 'data:image/jpg;base64,')):
        return True, 'jpeg'
    if base64_str.startswith('data:image/png;base64,'):
        return True, 'png'
    return False, None

def store_image(base64_str, user_id):
    """FR8: Store uploaded image and return relative URL"""
    os.makedirs(UPLOAD_DIR, exist_ok=True)

    file_ext = 'jpg' if ('jpeg' in base64_str or 'jpg' in base64_str) else 'png'

    if ',' in base64_str:
        base64_str = base64_str.split(',')[1]

    try:
        image_data = base64.b64decode(base64_str)
    except Exception:
        return None

    hash_name = hashlib.md5(f"{user_id}{datetime.now(timezone.utc).timestamp()}".encode()).hexdigest()
    filepath = os.path.join(UPLOAD_DIR, f"{hash_name}.{file_ext}")

    try:
        with open(filepath, 'wb') as f:
            f.write(image_data)
        return f"/{filepath}"
    except Exception:
        return None

def full_picture_url(profile_pic):
    """Prefix relative picture paths with backend URL"""
    if profile_pic and not profile_pic.startswith('http'):
        return f"{BACKEND_URL}{profile_pic}"
    return profile_pic

def get_user_or_404(users_collection, user_id):
    """Fetch user by ID or return None"""
    return users_collection.find_one({"_id": ObjectId(user_id)})

def serialize_user(user):
    """Return serializable profile dict from user document"""
    return {
        "user_id": str(user["_id"]),
        "username": user.get("username", ""),
        "email": user.get("email", ""),
        "bio": user.get("bio", ""),
        "profile_picture": full_picture_url(user.get("profile_picture", ""))
    }

def validate_username(username):
    """Returns error string or None if valid"""
    if not username:
        return "Username cannot be empty"
    if len(username) < 3:
        return "Username must be at least 3 characters"
    if len(username) > 20:
        return "Username cannot exceed 20 characters"
    if not re.match(r'^[a-zA-Z0-9_]+$', username):
        return "Username can only contain letters, numbers, and underscores"
    return None

def validate_password_complexity(password):
    """Returns error string or None if valid"""
    if len(password) < 8:
        return "New password must be at least 8 characters"
    if not re.search(r'[a-z]', password):
        return "Password must contain at least one lowercase letter"
    if not re.search(r'[A-Z]', password):
        return "Password must contain at least one uppercase letter"
    if not re.search(r'\d', password):
        return "Password must contain at least one number"
    return None

def err(message, status=400):
    return {"success": False, "message": message}, status

def ok(message, data=None, status=200):
    response = {"success": True, "message": message}
    if data:
        response["data"] = data
    return response, status

#  ROUTES 

# FR6: GET /api/profile
@profile_bp.route('', methods=['GET'])
@jwt_required()
def get_profile():
    try:
        user_id = get_jwt_identity()
        db = current_app.db
        if db is None:
            return err("Database connection failed", 500)

        user = get_user_or_404(db["users"], user_id)
        if not user:
            return err("User not found", 404)

        return ok("Profile fetched", serialize_user(user))

    except Exception as e:
        print(f"Error fetching profile: {e}")
        return err(str(e), 500)


# FR6.2: PATCH /api/profile
@profile_bp.route('', methods=['PATCH'])
@jwt_required()
def update_profile():
    try:
        user_id = get_jwt_identity()
        db = current_app.db
        if db is None:
            return err("Database connection failed", 500)

        data = request.get_json()
        users_collection = db["users"]
        update_data = {}

        # FR6.2: Bio
        if "bio" in data:
            bio_text = data["bio"].strip()
            if len(bio_text) > 150:
                return err("Oopsies! Bio cannot exceed 150 characters :()")
            update_data["bio"] = bio_text

        # FR6.2: Username
        if "username" in data:
            new_username = data["username"].strip()
            error = validate_username(new_username)
            if error:
                return err(error)

            if users_collection.find_one({"username": new_username, "_id": {"$ne": ObjectId(user_id)}}):
                return err("Username already taken", 409)

            update_data["username"] = new_username

        # FR6.2: Email
        if "email" in data:
            new_email = data["email"].strip().lower()

            if not is_valid_email(new_email):
                return err("Invalid email format")

            current_user = get_user_or_404(users_collection, user_id)
            if new_email == current_user.get("email", "").lower():
                return err("Email address you entered is the same as previous one! Please provide a different email address if you want to update.")

            if users_collection.find_one({"email": new_email, "_id": {"$ne": ObjectId(user_id)}}):
                return err("Email already registered", 409)

            verification_code = secrets.token_hex(3).upper()
            update_data.update({
                "pending_email": new_email,
                "email_verification_code": verification_code
                # do NOT touch "email" or "is_verified"
            })

            from routes.auth import send_verification_email
            send_verification_email(new_email, verification_code)

        if not update_data:
            return err("No fields to update")

        users_collection.update_one({"_id": ObjectId(user_id)}, {"$set": update_data})

        if "username" in update_data:
            db["reviews"].update_many(
                {"user_id": ObjectId(user_id)},
                {"$set": {"username": update_data["username"]}}
            )

        updated_user = get_user_or_404(users_collection, user_id)
        return ok("Profile updated successfully", serialize_user(updated_user))

    except Exception as e:
        print(f"Error updating profile: {e}")
        return err(str(e), 500)


# FR7.3: POST /api/profile/password
@profile_bp.route('/password', methods=['POST'])
@jwt_required()
def change_password():
    try:
        user_id = get_jwt_identity()
        db = current_app.db
        if db is None:
            return err("Database connection failed", 500)

        data = request.get_json()
        current_password = data.get("current_password")
        new_password = data.get("new_password")

        if not current_password or not new_password:
            return err("Current password and new password are required")

        error = validate_password_complexity(new_password)
        if error:
            return err(error)

        user = get_user_or_404(db["users"], user_id)
        if not user:
            return err("User not found", 404)

        if not bcrypt.checkpw(current_password.encode('utf-8'), user["password"]):
            return err("Current password is incorrect")

        if bcrypt.checkpw(new_password.encode('utf-8'), user["password"]):
            return err("Your new password cannot be the same as your current password")

        hashed = bcrypt.hashpw(new_password.encode('utf-8'), bcrypt.gensalt())
        db["users"].update_one({"_id": ObjectId(user_id)}, {"$set": {"password": hashed}})

        return ok("Password changed successfully")

    except Exception as e:
        print(f"Error changing password: {e}")
        return err(str(e), 500)


# FR8: POST /api/profile/picture
@profile_bp.route('/picture', methods=['POST'])
@jwt_required()
def upload_profile_picture():
    try:
        user_id = get_jwt_identity()
        db = current_app.db
        if db is None:
            return err("Database connection failed", 500)

        data = request.get_json()
        image_base64 = data.get("image")

        if not image_base64:
            return err("Image is required")

        is_valid, _ = is_valid_image(image_base64)
        if not is_valid:
            return err("Only JPG/PNG/JPEG files allowed")

        picture_url = store_image(image_base64, user_id)
        if not picture_url:
            return err("Failed to save image", 500)

        db["users"].update_one({"_id": ObjectId(user_id)}, {"$set": {"profile_picture": picture_url}})

        return ok("Profile picture uploaded successfully", {"profile_picture": f"{BACKEND_URL}{picture_url}"})

    except Exception as e:
        print(f"Error uploading picture: {e}")
        return err(str(e), 500)