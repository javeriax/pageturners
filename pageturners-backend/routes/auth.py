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

#login backend:
@auth_bp.route('/login', methods=['POST'])
def login():
    from app import db
    from flask_jwt_extended import create_access_token
    import bcrypt

    data = request.get_json()

    email = data.get('email', '').strip().lower()
    password = data.get('password', '').strip()

    # Validate fields
    if not email or not password:
        return {
            "success": False,
            "message": "Email and password are required"
        }, 400

    # Find user in database
    user = db.users.find_one({"email": email})

    if not user:
        return {
            "success": False,
            "message": "Invalid email or password"
        }, 401

    # Check password
    if not bcrypt.checkpw(password.encode('utf-8'), user['password']):
        return {
            "success": False,
            "message": "Invalid email or password"
        }, 401

    # Generate JWT token
    token = create_access_token(identity=str(user['_id']))

    return {
        "success": True,
        "message": "Login successful",
        "token": token
    }, 200