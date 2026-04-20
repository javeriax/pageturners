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


def send_password_reset_email(email, reset_code):
    """Send password reset email to user via Gmail SMTP"""
    try:
        smtp_server = os.getenv("SMTP_SERVER", "localhost")
        smtp_port = int(os.getenv("SMTP_PORT", "587"))
        sender_email = os.getenv("SENDER_EMAIL", "noreply@pageturners.local")
        sender_password = os.getenv("SENDER_PASSWORD", "")
        
        message = MIMEMultipart("alternative")
        message["Subject"] = "PageTurners - Reset Your Password"
        message["From"] = sender_email
        message["To"] = email
        
        # Create reset link (user will click this link or enter code manually)
        reset_link = f"http://localhost:5173/reset-password?email={email}&code={reset_code}"
        
        text = f"""
        Password Reset Request
        
        We received a request to reset your password. Click the link below or enter the code:
        {reset_link}
        
        Reset Code: {reset_code}
        
        This code will expire in 1 hour.
        If you didn't request this, please ignore this email.
        """
        
        html = f"""\
        <html>
          <body>
            <h2>Reset Your Password</h2>
            <p>We received a request to reset your password. Click the link below or enter the code:</p>
            <a href="{reset_link}">Reset Password</a>
            <p>Reset Code: <strong>{reset_code}</strong></p>
            <p>This code will expire in 1 hour.</p>
            <p><em>If you didn't request this, please ignore this email.</em></p>
          </body>
        </html>
        """
        
        part1 = MIMEText(text, "plain")
        part2 = MIMEText(html, "html")
        message.attach(part1)
        message.attach(part2)
        
        with smtplib.SMTP(smtp_server, smtp_port, timeout=10) as server:
            server.ehlo()
            server.starttls()
            server.login(sender_email, sender_password)
            server.sendmail(sender_email, email, message.as_string())
        
        print(f"✓ Password reset email sent to {email}")
        return True
    except Exception as e:
        print(f"✗ Error sending password reset email: {e}")
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


@auth_bp.route('/forgot-password', methods=['POST'])
def forgot_password():
    """Send password reset email to user"""
    try:
        from backend_app import db
        
        data = request.get_json()
        email = data.get('email', '').strip().lower()
        
        if not email:
            return {
                "success": False,
                "message": "Email is required"
            }, 400
        
        users_collection = db["users"]
        user = users_collection.find_one({"email": email})
        
        # For security: don't reveal whether email exists or not
        if not user:
            return {
                "success": True,
                "message": "If this email exists in our system, you will receive a password reset link."
            }, 200
        
        # Generate password reset code (6-character hex code)
        reset_code = secrets.token_hex(3).upper()
        
        # Store reset code with timestamp (expires in 1 hour)
        users_collection.update_one(
            {"_id": user["_id"]},
            {
                "$set": {
                    "password_reset_code": reset_code,
                    "password_reset_expires": datetime.now(timezone.utc),
                    "updated_at": datetime.now(timezone.utc)
                }
            }
        )
        
        # Send password reset email
        email_sent = send_password_reset_email(email, reset_code)
        
        if not email_sent:
            return {
                "success": False,
                "message": "Failed to send password reset email. Please try again."
            }, 500
        
        return {
            "success": True,
            "message": "If this email exists in our system, you will receive a password reset link."
        }, 200
        
    except Exception as e:
        print(f"Forgot password error: {e}")
        return {
            "success": False,
            "message": "An error occurred. Please try again."
        }, 500


@auth_bp.route('/reset-password', methods=['POST'])
def reset_password():
    """Reset user password with reset code"""
    try:
        from backend_app import db
        from datetime import timedelta
        
        data = request.get_json()
        email = data.get('email', '').strip().lower()
        reset_code = data.get('reset_code', '').strip().upper()
        new_password = data.get('new_password', '').strip()
        
        # Validate all fields are present
        if not email or not reset_code or not new_password:
            return {
                "success": False,
                "message": "Email, reset code, and new password are required"
            }, 400
        
        # Validate password strength (at least 8 characters)
        if len(new_password) < 8:
            return {
                "success": False,
                "message": "Password must be at least 8 characters long"
            }, 400
        
        users_collection = db["users"]
        user = users_collection.find_one({"email": email})
        
        if not user:
            return {
                "success": False,
                "message": "Invalid email or reset code"
            }, 400
        
        # Check if reset code exists and matches
        if user.get("password_reset_code") != reset_code:
            return {
                "success": False,
                "message": "Invalid or expired reset code"
            }, 400
        
        # Check if reset code has expired (1 hour)
        if "password_reset_expires" in user:
            reset_time = user["password_reset_expires"]
            if reset_time is not None:
                # Ensure reset_time is timezone-aware
                if reset_time.tzinfo is None:
                    reset_time = reset_time.replace(tzinfo=timezone.utc)
                
                expiry_time = reset_time + timedelta(hours=1)
                current_time = datetime.now(timezone.utc)
                if current_time > expiry_time:
                    return {
                        "success": False,
                        "message": "Reset code has expired. Please request a new one."
                    }, 400
        
        # Check if new password is the same as current password
        import bcrypt
        if bcrypt.checkpw(new_password.encode('utf-8'), user['password']):
            return {
                "success": False,
                "message": "You cannot keep this as your new password. Please choose a different password."
            }, 400
        
        # Hash new password
        hashed_password = hash_password(new_password)
        
        # Update password and remove reset code
        users_collection.update_one(
            {"_id": user["_id"]},
            {
                "$set": {
                    "password": hashed_password,
                    "updated_at": datetime.now(timezone.utc)
                },
                "$unset": {
                    "password_reset_code": "",
                    "password_reset_expires": ""
                }
            }
        )
        
        return {
            "success": True,
            "message": "Password reset successfully. You can now log in with your new password."
        }, 200
        
    except Exception as e:
        return {
            "success": False,
            "message": "An error occurred. Please try again."
        }, 500