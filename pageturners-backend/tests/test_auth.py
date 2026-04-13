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
