from flask import Blueprint, request
import os
from dotenv import load_dotenv
import bcrypt
from datetime import datetime, timezone # Use timezone-aware objects
import secrets
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

load_dotenv()

auth_bp = Blueprint('auth', __name__, url_prefix='/api/auth')


def hash_password(password):
    """Hash password using bcrypt"""
    salt = bcrypt.gensalt(rounds=12)
    return bcrypt.hashpw(password.encode('utf-8'), salt)


def send_verification_email(email, verification_code):
    """Send verification email to user via local gmail SMTP server"""
    try:
        smtp_server = os.getenv("SMTP_SERVER", "localhost")
        smtp_port = int(os.getenv("SMTP_PORT", "587"))
        sender_email = os.getenv("SENDER_EMAIL", "noreply@pageturners.local")
        sender_password = os.getenv("SENDER_PASSWORD", "")
        
        message = MIMEMultipart("alternative")
        message["Subject"] = "PageTurners - Verify Your Email"
        message["From"] = sender_email
        message["To"] = email
        
        # Create verification link (user will click this link to verify)
        verification_link = f"http://localhost:5173/verify-email?email={email}&code={verification_code}"
        
        text = f"""
        Welcome to PageTurners!
        
        Please verify your email by visiting this link:
        {verification_link}
        
        Or enter this verification code: {verification_code}
        
        This code will expire in 24 hours.
        """
        
        html = f"""\
        <html>
          <body>
            <h2>Welcome to PageTurners!</h2>
            <p>Please verify your email by clicking the link below:</p>
            <a href="{verification_link}">Verify Email</a>
            <p>Or enter this verification code: <strong>{verification_code}</strong></p>
            <p>This code will expire in 24 hours.</p>
          </body>
        </html>
        """
        
        part1 = MIMEText(text, "plain")
        part2 = MIMEText(html, "html")
        message.attach(part1)
        message.attach(part2)

        # # Connect to Mailpit (no authentication needed). Use this and uncomment the Gmail one if you have mailpit
        # # and want to test email sending. Change the port num to 1025 instead of 587 if using Mailpit.
        # with smtplib.SMTP(smtp_server, smtp_port, timeout=5) as server:
        #     server.sendmail(sender_email, email, message.as_string())
        
        # Connect to Gmail securely using TLS. Port 587 is for TLS. Make sure to set up an App Password
        # in your Gmail account and use it as SENDER_PASSWORD in .env
        with smtplib.SMTP(smtp_server, smtp_port, timeout=10) as server:
            server.ehlo() # Can be omitted, but good practice to say 'hello' to the server
            server.starttls() # Upgrades the connection to a secure encrypted SSL/TLS connection
            server.login(sender_email, sender_password) # Log in with App Password
            server.sendmail(sender_email, email, message.as_string())
        
        print(f"✓ Verification email sent to {email}")
        return True
    except Exception as e:
        print(f"✗ Error sending email: {e}")
        return False


@auth_bp.route('/register', methods=['POST'])
def register():
    """Register a new user account"""
    try:
        print("Register endpoint called")
        # Get registration data sent from frontend
        data = request.get_json()
        print(f"Request data: {data}")
        
        # Extract username, email and password from request
        username = data.get('username', '').strip()
        email = data.get('email', '').strip().lower()
        password = data.get('password', '').strip()
        
        print(f"Extracted: username={username}, email={email}")
        
        # Validate that all required fields are present
        if not username or not email or not password:
            return {
                "success": False,
                "message": "Username, email and password are required"
            }, 400
        
        # Get database reference
        from backend_app import db
        users_collection = db["users"]
        
        print("Connected to database")
        
        # Check if email already exists
        if users_collection.find_one({"email": email}):
            return {
                "success": False,
                "message": "Email already registered"
            }, 409
        
        # Check if username already exists
        if users_collection.find_one({"username": username}):
            return {
                "success": False,
                "message": "Username already taken"
            }, 409
        
        # Hash the password
        hashed_password = hash_password(password)
        
        # Generate verification code
        verification_code = secrets.token_hex(3).upper()  # 6-character hex code
        
        # Create user document
        user_document = {
            "username": username,
            "email": email,
            "password": hashed_password,
            "is_verified": False,
            "verification_code": verification_code,
            # "created_at": datetime.utcnow(),
            # "updated_at": datetime.utcnow()
            # Replace datetime.utcnow() with:
            "created_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc)
        }
        
        # Insert user into database
        result = users_collection.insert_one(user_document)
        user_id = str(result.inserted_id)
        
        print(f"User created with ID: {user_id}")
        
        # Send verification email
        email_sent = send_verification_email(email, verification_code)
        
        return {
            "success": True,
            "message": "Registration successful. Verification code sent to your email.",
            "user_id": user_id
        }, 201
        
    except Exception as e:
        print(f"Registration error: {e}")
        import traceback
        traceback.print_exc()
        return {
            "success": False,
       "message": "An error occurred during registration"
        }, 500


@auth_bp.route('/verify-email', methods=['POST'])
def verify_email():
    """Verify user email with specific feedback messages"""
    try:
        data = request.get_json()
        email = data.get('email', '').strip().lower()
        verification_code = data.get('verification_code', '').strip().upper()
        
        if not email or not verification_code:
            return {
                "success": False,
                "message": "Email and verification code are required"
            }, 400
        
        from backend_app import db
        users_collection = db["users"]
        
        user = users_collection.find_one({"email": email})
        
        if not user:
            return {
                "success": False,
                "message": "No account found with this email address."
            }, 404

        if user.get("is_verified") is True:
            return {
                "success": True, 
                "message": "Email is already verified. You can go to the login page!"
            }, 200

        if user.get("verification_code") != verification_code:
            return {
                "success": False,
                "message": "The code you entered is incorrect. Please check your email."
            }, 400
        
        users_collection.update_one(
            {"_id": user["_id"]},
            {
                "$set": {
                    "is_verified": True,
                    "updated_at": datetime.utcnow()
                },
                "$unset": {"verification_code": ""} 
            }
        )
        
        return {
            "success": True,
            "message": "Email verified successfully! You can now log in."
        }, 200
        
    except Exception as e:
        print(f"Email verification error: {e}")
        return {
            "success": False,
            "message": "A server error occurred. Please try again."
        }, 500


@auth_bp.route('/login', methods=['POST'])
def login():
    from backend_app import db
    from flask_jwt_extended import create_access_token
    import bcrypt

    data = request.get_json()

    email = data.get('email', '').strip().lower()
    password = data.get('password', '').strip()

    if not email or not password:
        return {
            "success": False,
            "message": "Email and password are required"
        }, 400

    user = db.users.find_one({"email": email})

    if not user:
        return {
            "success": False,
            "message": "Invalid email or password"
        }, 401

    if not bcrypt.checkpw(password.encode('utf-8'), user['password']):
        return {
            "success": False,
            "message": "Invalid email or password"
        }, 401

    token = create_access_token(identity=str(user['_id']))

    return {
        "success": True,
        "message": "Login successful",
        "token": token
    }, 200


@auth_bp.route('/logout', methods=['POST'])
def logout():
    """
    Logout endpoint - invalidates user's session
    Requires Authorization header with JWT token
    Returns success message
    """
    try:
        from flask_jwt_extended import decode_token
        
        # Get token from Authorization header
        auth_header = request.headers.get('Authorization')
        
        if not auth_header:
            return {
                "success": False,
                "message": "Authorization header missing"
            }, 401

        # Extract token from "Bearer <token>" format
        try:
            token = auth_header.split(' ')[1]
        except IndexError:
            return {
                "success": False,
                "message": "Invalid authorization header format"
            }, 401

        # Verify JWT token is valid
        try:
            decode_token(token)
        except Exception as jwt_error:
            return {
                "success": False,
                "message": f"Invalid token: {str(jwt_error)}"
            }, 422

        # In a real app, you would:
        # 1. Add token to a blacklist (Redis/Database)
        # 2. Or invalidate the session in database
        # For now, we just return success as frontend clears token

        return {
            "success": True,
            "message": "Logged out successfully"
        }, 200

    except Exception as e:
        return {
            "success": False,
            "message": str(e)
        }, 500