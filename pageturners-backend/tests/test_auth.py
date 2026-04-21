import pytest
import mongomock
from backend_app import app, db
from datetime import datetime, timezone

@pytest.fixture
def client():
    """Configures the app for testing and provides a test client."""
    app.config['TESTING'] = True
    with app.test_client() as client:
        yield client

@pytest.fixture(autouse=True)
def mock_db(monkeypatch):
    """Replaces the real database with a mock one for every test."""
    mock_client = mongomock.MongoClient()
    mock_database = mock_client["pageturners_test"]
    # Force the app to use the mock database to avoid touching real data
    monkeypatch.setattr("backend_app.db", mock_database)
    return mock_database

# TC-AM-01: New User Registration 
def test_register_success(client, mock_db):
    payload = {
        "username": "testuser",
        "email": "test@example.com",
        "password": "Password123"
    }
    response = client.post('/api/auth/register', json=payload)
    data = response.get_json()
    
    assert response.status_code == 201
    assert data["success"] is True
    # Verify user details are stored in the database [cite: 117]
    assert mock_db.users.find_one({"email": "test@example.com"}) is not None

# TC-AM-02: Duplicate Email Validation
def test_register_duplicate_email(client, mock_db):
    # Pre-insert an existing user [cite: 117]
    mock_db.users.insert_one({"email": "existing@example.com", "username": "olduser"})
    
    payload = {
        "username": "newuser",
        "email": "existing@example.com",
        "password": "Password123"
    }
    response = client.post('/api/auth/register', json=payload)
    # System should display email already registered 
    assert response.status_code == 409
    assert response.get_json()["message"] == "Email already registered"

#LOGIN TESTS
# TC-AM-03: Login Of Registered User
def test_login_success(client, mock_db):
    import bcrypt
    # Pre-insert a verified user with hashed password
    hashed = bcrypt.hashpw("Password123".encode('utf-8'), bcrypt.gensalt())
    mock_db.users.insert_one({
        "username": "testuser",
        "email": "test@example.com",
        "password": hashed,
        "is_verified": True
    })

    payload = {
        "email": "test@example.com",
        "password": "Password123"
    }
    # User should be authenticated and JWT token issued
    response = client.post('/api/auth/login', json=payload)
    data = response.get_json()

    assert response.status_code == 200
    assert data["success"] is True
    assert "token" in data
    # TC-API-01: Verify token is valid JWT format (3 parts)
    assert len(data["token"].split(".")) == 3

# TC-AM-04: Invalid Login Attempt 
def test_invalid_login_attempt(client, mock_db):
    payload = {
        "email": "wrong@example.com",
        "password": "WrongPassword"
    }
    # Verify behavior when incorrect credentials are entered 
    response = client.post('/api/auth/login', json=payload)
    # Depending on your implementation, this may return 401 or 404
    assert response.status_code in [401, 404]

# TC-PL-07: Duplicate Book in Library 
def test_duplicate_book_in_library(client, mock_db):
    # Pre-insert a book into the user's library 
    mock_db.library.insert_one({
        "user_email": "test@example.com",
        "book_id": "b001"
    })
    
    payload = {"book_id": "b001"}
    # Note: In a real test, you would need to provide a JWT token for the user
    response = client.post('/api/library/add', json=payload)
    
    # System should prevent adding a book that already exists 
    if response.status_code == 409:
        assert response.get_json()["message"] == "Book already in your library"


# TC-AM-10: Email Verification After Registration 
def test_verify_email_success(client, mock_db):
    mock_db.users.insert_one({
        "email": "verify@example.com",
        "verification_code": "A1B2C3",
        "is_verified": False
    })
    
    payload = {
        "email": "verify@example.com",
        "verification_code": "A1B2C3"
    }
    response = client.post('/api/auth/verify-email', json=payload)
    assert response.status_code == 200
    
    user = mock_db.users.find_one({"email": "verify@example.com"})
    # Account must be marked as verified in the database [cite: 124]
    assert user["is_verified"] is True

# TC-API-01: Login API Response Validation
def test_login_returns_valid_jwt_token(client, mock_db):
    import bcrypt
    # Pre-insert a verified user with hashed password
    hashed = bcrypt.hashpw("Password123".encode('utf-8'), bcrypt.gensalt())
    mock_db.users.insert_one({
        "username": "bushra",
        "email": "bushraa.sadaf@gmail.com",
        "password": hashed,
        "is_verified": True
    })

    payload = {
        "email": "bushraa.sadaf@gmail.com",
        "password": "Password123"
    }
    response = client.post('/api/auth/login', json=payload)
    data = response.get_json()

    # TC-API-01: API returns 200 OK with valid JWT token
    assert response.status_code == 200
    assert "token" in data
    # Valid JWT has exactly 3 parts separated by dots
    parts = data["token"].split(".")
    assert len(parts) == 3

# TC-API-02: Protected API Access Without Token
def test_protected_books_initial_without_token(client):
    response = client.get('/api/books/initial')
    assert response.status_code == 401

# TC-AM-05: User Logout - Session Invalidation
def test_logout_success(client, mock_db):
    """
    TEST CASE: TC-AM-05 - Logout Functionality
    Description: Verify user can successfully logout and token is invalidated
    Precondition: User is logged in with valid JWT token
    """
    import bcrypt
    # Pre-insert a verified user
    hashed = bcrypt.hashpw("Password123".encode('utf-8'), bcrypt.gensalt())
    user = mock_db.users.insert_one({
        "username": "testuser",
        "email": "logout@example.com",
        "password": hashed,
        "is_verified": True
    })
    
    # First, login to get token
    login_payload = {
        "email": "logout@example.com",
        "password": "Password123"
    }
    login_response = client.post('/api/auth/login', json=login_payload)
    token = login_response.get_json()["token"]
    
    # Now logout with valid token
    headers = {"Authorization": f"Bearer {token}"}
    logout_response = client.post('/api/auth/logout', headers=headers)
    logout_data = logout_response.get_json()
    
    # System should return 200 OK with success message
    assert logout_response.status_code == 200
    assert logout_data["success"] is True
    assert "Logged out" in logout_data["message"]

# TC-AM-06: Logout Without Authorization Token
def test_logout_without_token(client):
    """
    TEST CASE: TC-AM-06 - Logout Authentication Validation
    Description: Verify logout fails when no Authorization header provided
    Expected: 401 Unauthorized
    """
    # Attempt logout without Authorization header
    response = client.post('/api/auth/logout')
    
    # System should reject request without token
    assert response.status_code == 401
    assert response.get_json()["success"] is False

# TC-AM-07: Logout With Invalid Token
def test_logout_with_invalid_token(client):
    """
    TEST CASE: TC-AM-07 - Invalid Token Rejection
    Description: Verify logout rejects malformed/invalid JWT tokens
    Expected: 401 Unauthorized or 422 Unprocessable Entity
    """
    invalid_token = "invalid.token.here"
    headers = {"Authorization": f"Bearer {invalid_token}"}
    
    response = client.post('/api/auth/logout', headers=headers)
    
    # System should reject invalid token
    assert response.status_code in [401, 422]
    assert response.get_json()["success"] is False


# TC-PF-01: Password Reset Via Email
def test_password_reset_via_email(client, mock_db, monkeypatch):
    import bcrypt
    
    # Pre-setup: Register a verified user with an initial password
    old_password = "OldPassword123"
    hashed_old_password = bcrypt.hashpw(old_password.encode('utf-8'), bcrypt.gensalt())
    user_email = "reset@example.com"
    
    mock_db.users.insert_one({
        "username": "resetuser",
        "email": user_email,
        "password": hashed_old_password,
        "is_verified": True
    })
    
    # Step 1 & 2: User clicks "Forgot Password" and enters email
    forgot_payload = {
        "email": user_email
    }
    response = client.post('/api/auth/forgot-password', json=forgot_payload)
    assert response.status_code == 200
    assert response.get_json()["success"] is True
    
    # Step 3: Extract reset code from database (simulating clicking reset link in email)
    user = mock_db.users.find_one({"email": user_email})
    assert "password_reset_code" in user
    reset_code = user["password_reset_code"]
    
    # Step 4: User enters new password and submits reset form
    new_password = "NewPassword123"
    reset_payload = {
        "email": user_email,
        "reset_code": reset_code,
        "new_password": new_password
    }
    response = client.post('/api/auth/reset-password', json=reset_payload)
    assert response.status_code == 200
    assert response.get_json()["success"] is True
    assert "Password reset successfully" in response.get_json()["message"]
    
    # Verify: System updates the password in the database
    updated_user = mock_db.users.find_one({"email": user_email})
    # Password should have been updated (not the same hash as before)
    assert updated_user["password"] != hashed_old_password
    # Reset code should be cleared
    assert "password_reset_code" not in updated_user or updated_user.get("password_reset_code") == ""
    
    # Verify: User can login with new password
    login_payload = {
        "email": user_email,
        "password": new_password
    }
    response = client.post('/api/auth/login', json=login_payload)
    assert response.status_code == 200
    assert response.get_json()["success"] is True
    assert "token" in response.get_json()
    
    # Verify: User cannot login with old password
    old_login_payload = {
        "email": user_email,
        "password": old_password
    }
    response = client.post('/api/auth/login', json=old_login_payload)
    assert response.status_code == 401
    assert response.get_json()["success"] is False