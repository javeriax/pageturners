from flask import Blueprint, request
import os
from dotenv import load_dotenv

load_dotenv()

auth_bp = Blueprint('auth', __name__, url_prefix='/api/auth')


@auth_bp.route('/register', methods=['POST'])
def register():
    # Get registration data sent from frontend
    data = request.get_json()
    
    # Extract username, email and password from request
    username = data.get('username', '').strip()
    email = data.get('email', '').strip().lower()
    password = data.get('password', '').strip()
    
    # Validate that all required fields are present
    if not username or not email or not password:
        return {
            "success": False,
            "message": "Username, email and password are required"
        }, 400
    
    # TODO: Backend team needs to implement these tasks:
    # 1. Check if email already exists in database
    # 2. Check if username already exists in database
    # 3. Hash password using bcrypt
    # 4. Create user document in MongoDB with: username, email, password (hashed), is_verified, created_at
    # 5. Send verification email to user
    # 6. Return success response with user_id
    
    # Placeholder response (remove this after implementing above)
    return {
        "success": True,
        "message": "Registration successful. Verification code sent to your email.",
        "user_id": "placeholder_user_id"
    }, 201
