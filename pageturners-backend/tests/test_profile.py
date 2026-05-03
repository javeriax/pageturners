# Backend tests for profile management - FR6, FR7, FR8
# Tests profile updates, password changes, picture uploads

import pytest
import mongomock
from backend_app import app
from bson import ObjectId
import bcrypt

# ─── CONSTANTS ───

TEST_PASSWORD = "TestPassword123"
TEST_USER = {
    "username": "testuser",
    "email": "test@example.com",
    "bio": "Test bio",
    "profile_picture": "",
    "is_verified": True
}

VALID_JPEG = "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEA"
VALID_PNG = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
INVALID_PDF = "data:application/pdf;base64,JVBERi0xLjQK"

# ─── FIXTURES ───

@pytest.fixture
def client():
    app.config['TESTING'] = True
    with app.test_client() as client:
        yield client

@pytest.fixture(autouse=True)
def mock_db(monkeypatch):
    mock_client = mongomock.MongoClient()
    mock_database = mock_client["pageturners_test"]
    monkeypatch.setattr("backend_app.db", mock_database)
    app.db = mock_database
    return mock_database

@pytest.fixture
def auth_token(mock_db):
    from flask_jwt_extended import create_access_token
    hashed_password = bcrypt.hashpw(TEST_PASSWORD.encode('utf-8'), bcrypt.gensalt())
    user = mock_db.users.insert_one({**TEST_USER, "password": hashed_password})
    with app.app_context():
        token = create_access_token(identity=str(user.inserted_id))
    return token, str(user.inserted_id)

# ─── HELPERS ───

def auth_headers(token):
    return {"Authorization": f"Bearer {token}"}

def patch_profile(client, token, payload):
    return client.patch('/api/profile', json=payload, headers=auth_headers(token))

def post_password(client, token, current, new):
    return client.post('/api/profile/password', json={
        "current_password": current,
        "new_password": new
    }, headers=auth_headers(token))

def post_picture(client, token, image):
    return client.post('/api/profile/picture', json={"image": image}, headers=auth_headers(token))

def create_extra_user(mock_db, username, email):
    hashed = bcrypt.hashpw("Pass123".encode('utf-8'), bcrypt.gensalt())
    mock_db.users.insert_one({"username": username, "email": email, "password": hashed, "is_verified": True})

# ─── FR6: GET PROFILE ───

class TestGetProfile:

    def test_get_profile_success(self, client, auth_token):
        """Successfully fetch user profile with all fields"""
        token, _ = auth_token
        response = client.get('/api/profile', headers=auth_headers(token))
        assert response.status_code == 200
        data = response.get_json()
        assert data['success'] == True
        for field in ('user_id', 'username', 'email', 'bio', 'profile_picture'):
            assert field in data['data']

    def test_get_profile_unauthorized(self, client):
        """Unauthenticated request returns 401"""
        assert client.get('/api/profile').status_code == 401

    def test_get_profile_returns_correct_data(self, client, auth_token):
        """Returns correct username, email, bio"""
        token, _ = auth_token
        data = client.get('/api/profile', headers=auth_headers(token)).get_json()['data']
        assert data['username'] == 'testuser'
        assert data['email'] == 'test@example.com'
        assert data['bio'] == 'Test bio'


# ─── FR6.2: UPDATE PROFILE ───

class TestUpdateProfile:

    def test_update_bio_success(self, client, auth_token):
        """Successfully update user bio"""
        token, _ = auth_token
        response = patch_profile(client, token, {"bio": "New bio"})
        assert response.status_code == 200
        assert response.get_json()['data']['bio'] == 'New bio'

    def test_update_username_success(self, client, auth_token):
        """Successfully update username"""
        token, _ = auth_token
        response = patch_profile(client, token, {"username": "newusername"})
        assert response.status_code == 200
        assert response.get_json()['data']['username'] == 'newusername'

    def test_update_email_success(self, client, auth_token):
        """Successfully update email"""
        token, _ = auth_token
        response = patch_profile(client, token, {"email": "newemail@example.com"})
        assert response.status_code == 200
        assert response.get_json()['data']['email'] == 'newemail@example.com'

    def test_update_partial_fields(self, client, auth_token):
        """Partial update only changes provided fields"""
        token, _ = auth_token
        data = patch_profile(client, token, {"bio": "Updated bio"}).get_json()['data']
        assert data['bio'] == 'Updated bio'
        assert data['username'] == 'testuser'
        assert data['email'] == 'test@example.com'

    def test_username_already_taken(self, client, mock_db, auth_token):
        """Returns 409 if username already taken"""
        token, _ = auth_token
        create_extra_user(mock_db, "existinguser", "existing@example.com")
        response = patch_profile(client, token, {"username": "existinguser"})
        assert response.status_code == 409
        assert 'already taken' in response.get_json()['message'].lower()

    def test_invalid_email_format(self, client, auth_token):
        """Returns 400 for invalid email format"""
        token, _ = auth_token
        response = patch_profile(client, token, {"email": "invalidemail"})
        assert response.status_code == 400
        assert 'invalid' in response.get_json()['message'].lower()

    def test_email_already_registered(self, client, mock_db, auth_token):
        """Returns 409 if email already registered"""
        token, _ = auth_token
        create_extra_user(mock_db, "otheruser", "other@example.com")
        response = patch_profile(client, token, {"email": "other@example.com"})
        assert response.status_code == 409

    def test_update_profile_unauthorized(self, client):
        """Unauthenticated PATCH returns 401"""
        assert client.patch('/api/profile', json={"bio": "New bio"}).status_code == 401


# ─── FR7.3: CHANGE PASSWORD ───

class TestChangePassword:

    def test_change_password_success(self, client, auth_token):
        """Successfully change password"""
        token, _ = auth_token
        response = post_password(client, token, TEST_PASSWORD, "NewPassword123")
        assert response.status_code == 200
        assert response.get_json()['success'] == True

    def test_incorrect_current_password(self, client, auth_token):
        """Returns 400 when current password is incorrect"""
        token, _ = auth_token
        response = post_password(client, token, "WrongPassword", "NewPassword123")
        assert response.status_code == 400
        assert 'incorrect' in response.get_json()['message'].lower()

    def test_new_password_too_short(self, client, auth_token):
        """Returns 400 if new password under 8 characters"""
        token, _ = auth_token
        response = post_password(client, token, TEST_PASSWORD, "Short1")
        assert response.status_code == 400
        assert 'at least 8' in response.get_json()['message'].lower()

    def test_change_password_unauthorized(self, client):
        """Unauthenticated POST returns 401"""
        assert client.post('/api/profile/password', json={
            "current_password": TEST_PASSWORD, "new_password": "NewPassword123"
        }).status_code == 401


# ─── FR8: PICTURE UPLOAD ───

class TestProfilePictureUpload:

    def test_upload_valid_jpeg(self, client, auth_token):
        """Successfully upload a valid JPEG"""
        token, _ = auth_token
        response = post_picture(client, token, VALID_JPEG)
        assert response.status_code == 200
        assert response.get_json()['success'] == True
        assert 'profile_picture' in response.get_json()['data']

    def test_upload_valid_png(self, client, auth_token):
        """Successfully upload a valid PNG"""
        token, _ = auth_token
        response = post_picture(client, token, VALID_PNG)
        assert response.status_code == 200
        assert response.get_json()['success'] == True

    def test_invalid_file_type(self, client, auth_token):
        """Returns 400 for invalid file type"""
        token, _ = auth_token
        response = post_picture(client, token, INVALID_PDF)
        assert response.status_code == 400
        assert 'only jpg/png/jpeg' in response.get_json()['message'].lower()

    def test_picture_upload_unauthorized(self, client):
        """Unauthenticated POST returns 401"""
        assert client.post('/api/profile/picture', json={"image": VALID_JPEG}).status_code == 401


# ─── INTEGRATION TESTS ───

class TestProfileIntegration:

    def test_complete_profile_update_flow(self, client, mock_db, auth_token):
        """Complete profile update flow"""
        token, _ = auth_token
        assert patch_profile(client, token, {"bio": "Updated bio"}).status_code == 200
        assert patch_profile(client, token, {"username": "newusername"}).status_code == 200
        assert patch_profile(client, token, {"email": "new@example.com"}).status_code == 200
        assert post_password(client, token, TEST_PASSWORD, "NewPassword123").status_code == 200

        data = client.get('/api/profile', headers=auth_headers(token)).get_json()['data']
        assert data['bio'] == 'Updated bio'
        assert data['username'] == 'newusername'
        assert data['email'] == 'new@example.com'

    def test_profile_changes_persist_in_database(self, client, mock_db, auth_token):
        """Profile changes actually saved to MongoDB"""
        token, user_id = auth_token
        patch_profile(client, token, {"bio": "Persisted bio"})
        user = mock_db.users.find_one({"_id": ObjectId(user_id)})
        assert user['bio'] == 'Persisted bio'


if __name__ == '__main__':
    pytest.main([__file__, '-v'])