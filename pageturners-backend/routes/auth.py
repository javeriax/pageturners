from flask import Blueprint, request
import os
from dotenv import load_dotenv
import bcrypt
import re
import secrets
import smtplib
from datetime import datetime, timezone, timedelta
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

#load environment variables from .env file:
load_dotenv()

#blueprint for authentication routes:
auth_bp = Blueprint('auth', __name__, url_prefix='/api/auth')


# Helper Functions
#hashes a password using bcrypt with a salt and returns the hashed password. The salt is generated with 12 rounds for security:
def hash_password(password):
    salt = bcrypt.gensalt(rounds=12)
    return bcrypt.hashpw(password.encode('utf-8'), salt)

#gets the JSON data from the request body and returns it as a dictionary. If the request does not contain valid JSON, it returns an empty dictionary:
def get_json():
    return request.get_json() or {}

#returns the MongoDB collection for users. It imports the database instance from the main application and accesses the "users" collection:
def get_users_collection():
    from backend_app import db
    return db["users"]

#retrieves SMTP configuration from environment variables, providing defaults if not set. It returns a dictionary containing the SMTP server, port, sender email, and password:
def get_smtp_config():
    return {
        "server": os.getenv("SMTP_SERVER", "localhost"),
        "port": int(os.getenv("SMTP_PORT", "587")),
        "email": os.getenv("SENDER_EMAIL", "noreply@pageturners.local"),
        "password": os.getenv("SENDER_PASSWORD", "")
    }

#sends an email using the SMTP protocol. It constructs an email message with both plain text and HTML versions of the content:
def send_email(to_email, subject, text_body, html_body):
    """Generic email sender using SMTP"""
    try:
        cfg = get_smtp_config()

        message = MIMEMultipart("alternative")
        message["Subject"] = subject
        message["From"] = cfg["email"]
        message["To"] = to_email
        #attach both plain text and HTML versions of the email content
        message.attach(MIMEText(text_body, "plain"))
        message.attach(MIMEText(html_body, "html"))

        #establish a connection to the SMTP server, start TLS encryption, log in with the sender's email and password, and send the email message:
        with smtplib.SMTP(cfg["server"], cfg["port"], timeout=10) as server:
            server.ehlo()
            server.starttls()
            server.login(cfg["email"], cfg["password"])
            server.sendmail(cfg["email"], to_email, message.as_string())

        return True
    #print any exceptions that occur during the email sending process and return False to indicate failure:
    except Exception as e:
        print(f"Email error: {e}")
        return False

#checks length and character requirements for a password:
def validate_password_strength(password):
    if len(password) < 8:
        return "Password must be at least 8 characters long"
    if not re.search(r'[a-z]', password):
        return "Password must contain at least one lowercase letter"
    if not re.search(r'[A-Z]', password):
        return "Password must contain at least one uppercase letter"
    if not re.search(r'\d', password):
        return "Password must contain at least one number"
    return None



# Email Services

#generates a verification code and constructs both plain text and HTML email content to welcome new users and prompt them to verify their email address:
def send_verification_email(email, verification_code):
    link = f"http://localhost:5173/verify-email?email={email}&code={verification_code}"

    text = f"""
    Welcome to PageTurners!

    Verify your email using this link:
    {link}

    Or code: {verification_code}
    """

    html = f"""
    <html>
      <body>
        <h2>Welcome to PageTurners!</h2>
        <p>Click below to verify your email:</p>
        <a href="{link}">Verify Email</a>
        <p>Or use code: <strong>{verification_code}</strong></p>
      </body>
    </html>
    """

    return send_email(email, "PageTurners - Verify Your Email", text, html)

#sends a password reset email with a unique reset code and a link to the password reset page. The email includes both plain text and HTML versions of the content:
def send_password_reset_email(email, reset_code):
    link = f"http://localhost:5173/reset-password?email={email}&code={reset_code}"

    text = f"""
    Password Reset Request

    Reset link:
    {link}

    Reset code: {reset_code}
    """

    html = f"""
    <html>
      <body>
        <h2>Password Reset</h2>
        <p>Click below to reset password:</p>
        <a href="{link}">Reset Password</a>
        <p>Code: <strong>{reset_code}</strong></p>
      </body>
    </html>
    """

    return send_email(email, "PageTurners - Reset Password", text, html)



#routes:
#route for user registration:
@auth_bp.route('/register', methods=['POST'])
def register():
    try:
        data = get_json()

        username = data.get('username', '').strip()
        email = data.get('email', '').strip().lower()
        password = data.get('password', '').strip()

        if not username or not email or not password:
            return {"success": False, "message": "Username, email and password are required"}, 400

        users = get_users_collection()

        if users.find_one({"email": email}):
            return {"success": False, "message": "Email already registered"}, 409

        if users.find_one({"username": username}):
            return {"success": False, "message": "Username already taken"}, 409

        hashed_password = hash_password(password)
        verification_code = secrets.token_hex(3).upper()

        user = {
            "username": username,
            "email": email,
            "password": hashed_password,
            "is_verified": False,
            "verification_code": verification_code,
            "created_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc)
        }

        result = users.insert_one(user)

        send_verification_email(email, verification_code)

        return {
            "success": True,
            "message": "Registration successful. Verification email sent.",
            "user_id": str(result.inserted_id)
        }, 201

    except Exception as e:
        print(f"Register error: {e}")
        return {"success": False, "message": "Registration failed"}, 500


#route for email verification:
@auth_bp.route('/verify-email', methods=['POST'])
def verify_email():
    try:
        data = get_json()

        email = data.get('email', '').strip().lower()
        code = data.get('verification_code', '').strip().upper()

        if not email or not code:
            return {"success": False, "message": "Email and code required"}, 400

        users = get_users_collection()
        user = users.find_one({"email": email})

        if not user:
            return {"success": False, "message": "Account not found"}, 404

        if user.get("is_verified"):
            return {"success": True, "message": "Already verified"}, 200

        if user.get("verification_code") != code:
            return {"success": False, "message": "Invalid verification code"}, 400

        users.update_one(
            {"_id": user["_id"]},
            {
                "$set": {
                    "is_verified": True,
                    "updated_at": datetime.now(timezone.utc)
                },
                "$unset": {"verification_code": ""}
            }
        )

        return {"success": True, "message": "Email verified successfully"}, 200

    except Exception as e:
        print(f"Verify error: {e}")
        return {"success": False, "message": "Verification failed"}, 500


#route for user login:
@auth_bp.route('/login', methods=['POST'])
def login():
    try:
        from flask_jwt_extended import create_access_token

        data = get_json()

        email = data.get('email', '').strip().lower()
        password = data.get('password', '').strip()

        if not email or not password:
            return {"success": False, "message": "Email and password required"}, 400

        users = get_users_collection()
        user = users.find_one({"email": email})

        if not user or not bcrypt.checkpw(password.encode('utf-8'), user['password']):
            return {"success": False, "message": "Invalid credentials"}, 401

        if not user.get("is_verified"):
            return {"success": False, "message": "Email not verified"}, 403

        token = create_access_token(identity=str(user['_id']))

        return {"success": True, "message": "Login successful", "token": token}, 200

    except Exception as e:
        print(f"Login error: {e}")
        return {"success": False, "message": "Login failed"}, 500

#route for user logout:
@auth_bp.route('/logout', methods=['POST'])
def logout():
    try:
        from flask_jwt_extended import decode_token

        auth_header = request.headers.get('Authorization')

        if not auth_header:
            return {"success": False, "message": "Missing token"}, 401

        try:
            token = auth_header.split(" ")[1]
        except:
            return {"success": False, "message": "Invalid header format"}, 401

        decode_token(token)

        return {"success": True, "message": "Logged out successfully"}, 200

    except Exception as e:
        return {"success": False, "message": str(e)}, 500

#route for forgot password:
@auth_bp.route('/forgot-password', methods=['POST'])
def forgot_password():
    try:
        data = get_json()
        email = data.get('email', '').strip().lower()

        if not email:
            return {"success": False, "message": "Email required"}, 400

        users = get_users_collection()

        generic_response = {
            "success": True,
            "message": "If email exists, reset link will be sent"
        }

        user = users.find_one({"email": email})

        if not user:
            return generic_response, 200

        reset_code = secrets.token_hex(3).upper()

        users.update_one(
            {"_id": user["_id"]},
            {
                "$set": {
                    "password_reset_code": reset_code,
                    "password_reset_expires": datetime.now(timezone.utc),
                    "updated_at": datetime.now(timezone.utc)
                }
            }
        )

        send_password_reset_email(email, reset_code)

        return generic_response, 200

    except Exception as e:
        print(f"Forgot password error: {e}")
        return {"success": False, "message": "Request failed"}, 500

#route for reset password:
@auth_bp.route('/reset-password', methods=['POST'])
def reset_password():
    try:
        data = get_json()

        email = data.get('email', '').strip().lower()
        code = data.get('reset_code', '').strip().upper()
        new_password = data.get('new_password', '').strip()

        if not email or not code or not new_password:
            return {"success": False, "message": "All fields required"}, 400

        error = validate_password_strength(new_password)
        if error:
            return {"success": False, "message": error}, 400

        users = get_users_collection()
        user = users.find_one({"email": email})

        if not user:
            return {"success": False, "message": "Invalid request"}, 400

        if user.get("password_reset_code") != code:
            return {"success": False, "message": "Invalid code"}, 400

        if user.get("password_reset_expires"):
            if datetime.now(timezone.utc) > user["password_reset_expires"] + timedelta(hours=1):
                return {"success": False, "message": "Code expired"}, 400

        if bcrypt.checkpw(new_password.encode('utf-8'), user['password']):
            return {"success": False, "message": "Choose a different password"}, 400

        users.update_one(
            {"_id": user["_id"]},
            {
                "$set": {
                    "password": hash_password(new_password),
                    "updated_at": datetime.now(timezone.utc)
                },
                "$unset": {
                    "password_reset_code": "",
                    "password_reset_expires": ""
                }
            }
        )

        return {"success": True, "message": "Password reset successful"}, 200

    except Exception as e:
        print(f"Reset error: {e}")
        return {"success": False, "message": "Reset failed"}, 500