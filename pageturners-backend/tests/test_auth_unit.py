# test_auth_unit.py
import bcrypt
from backend_app import app
# registration tests

# tc-am-01: new user registration
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

    user = mock_db.users.find_one({"email": "test@example.com"})
    assert user is not None
    assert user["is_verified"] is False


# tc-am-02: duplicate email validation
def test_register_duplicate_email(client, mock_db):
    mock_db.users.insert_one({
        "email": "existing@example.com",
        "username": "olduser"
    })

    payload = {
        "username": "newuser",
        "email": "existing@example.com",
        "password": "Password123"
    }

    response = client.post('/api/auth/register', json=payload)

    assert response.status_code == 409
    assert response.get_json()["message"] == "Email already registered"


# login tests

# tc-am-03: login of registered user
# tc-api-01: login API integration (token generation) via post request to /api/auth/login
def test_login_success(client, mock_db):
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

    response = client.post('/api/auth/login', json=payload)
    data = response.get_json()

    assert response.status_code == 200
    assert data["success"] is True

    # tc-api-01: jwt token validation
    assert "token" in data
    assert len(data["token"].split(".")) == 3


# tc-am-04: invalid login attempt
def test_invalid_login(client):
    payload = {
        "email": "wrong@example.com",
        "password": "WrongPassword"
    }

    response = client.post('/api/auth/login', json=payload)

    assert response.status_code == 401
    assert response.get_json()["success"] is False


# tc-am-03b: login blocked if not verified
def test_login_unverified_user(client, mock_db):
    hashed = bcrypt.hashpw("Password123".encode('utf-8'), bcrypt.gensalt())

    mock_db.users.insert_one({
        "email": "test@example.com",
        "password": hashed,
        "is_verified": False
    })

    payload = {
        "email": "test@example.com",
        "password": "Password123"
    }

    response = client.post('/api/auth/login', json=payload)

    assert response.status_code == 403


# email verification tests

# tc-am-10: email verification after registration
def test_verify_email_success(client, mock_db):
    mock_db.users.insert_one({
        "email": "verify@example.com",
        "verification_code": "ABC123",
        "is_verified": False
    })

    payload = {
        "email": "verify@example.com",
        "verification_code": "ABC123"
    }

    response = client.post('/api/auth/verify-email', json=payload)

    assert response.status_code == 200

    user = mock_db.users.find_one({"email": "verify@example.com"})
    assert user["is_verified"] is True


# tc-am-10b: invalid verification code
def test_verify_email_invalid_code(client, mock_db):
    mock_db.users.insert_one({
        "email": "verify@example.com",
        "verification_code": "ABC123",
        "is_verified": False
    })

    payload = {
        "email": "verify@example.com",
        "verification_code": "WRONG"
    }

    response = client.post('/api/auth/verify-email', json=payload)

    assert response.status_code == 400


# logout tests

# tc-am-05: secure logout
def test_logout_success(client):
    from flask_jwt_extended import create_access_token

    with app.app_context():
        token = create_access_token(identity="12345")

    headers = {"Authorization": f"Bearer {token}"}
    response = client.post('/api/auth/logout', headers=headers)

    assert response.status_code == 200
    assert response.get_json()["success"] is True


# tc-am-06: logout without token
def test_logout_no_token(client):
    response = client.post('/api/auth/logout')

    assert response.status_code == 401
    assert response.get_json()["success"] is False


# tc-am-07: logout with invalid token
def test_logout_invalid_token(client):
    headers = {"Authorization": "Bearer invalid.token.here"}

    response = client.post('/api/auth/logout', headers=headers)

    assert response.status_code in [401, 422]


# password reset tests

# tc-am-06: password reset via email
def test_password_reset_flow(client, mock_db):
    old_password = "OldPassword123"
    hashed_old = bcrypt.hashpw(old_password.encode('utf-8'), bcrypt.gensalt())

    mock_db.users.insert_one({
        "email": "reset@example.com",
        "password": hashed_old,
        "is_verified": True
    })

    response = client.post('/api/auth/forgot-password', json={
        "email": "reset@example.com"
    })

    assert response.status_code == 200

    user = mock_db.users.find_one({"email": "reset@example.com"})
    reset_code = user["password_reset_code"]

    new_password = "NewPassword123"

    response = client.post('/api/auth/reset-password', json={
        "email": "reset@example.com",
        "reset_code": reset_code,
        "new_password": new_password
    })

    assert response.status_code == 200

    updated_user = mock_db.users.find_one({"email": "reset@example.com"})
    assert updated_user["password"] != hashed_old

    login_response = client.post('/api/auth/login', json={
        "email": "reset@example.com",
        "password": new_password
    })

    assert login_response.status_code == 200


# tc-am-06b: invalid reset code
def test_reset_password_invalid_code(client, mock_db):
    mock_db.users.insert_one({
        "email": "reset@example.com",
        "password_reset_code": "ABC123",
        "is_verified": True
    })

    response = client.post('/api/auth/reset-password', json={
        "email": "reset@example.com",
        "reset_code": "WRONG",
        "new_password": "NewPassword123"
    })

    assert response.status_code == 400