
# Backend tests for profile management - FR6, FR7, FR8
# Tests profile updates, password changes, picture uploads

import pytest
import mongomock
from app import app
from datetime import datetime
from bson import ObjectId
import bcrypt

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
    monkeypatch.setattr("app.db", mock_database)
    return mock_database

@pytest.fixture
def auth_token(mock_db):
    """Create a test user and return a JWT token"""
    from flask_jwt_extended import create_access_token
    
    hashed_password = bcrypt.hashpw("TestPassword123".encode('utf-8'), bcrypt.gensalt())
    user = mock_db.users.insert_one({
        "username": "testuser",
        "email": "test@example.com",
        "password": hashed_password,
        "bio": "Test bio",
        "profile_picture": "",
        "is_verified": True
    })
    
    token = create_access_token(identity=str(user.inserted_id))
    return token, str(user.inserted_id)

# ─── FR6: GET PROFILE TESTS ───

class TestGetProfile:
    """Test FR6: Fetch user profile data"""
    
    def test_get_profile_success(self, client, mock_db, auth_token):
        """TC-UP-01: Successfully fetch user profile with all fields"""
        token, user_id = auth_token
        headers = {"Authorization": f"Bearer {token}"}
        
        response = client.get('/api/profile', headers=headers)
        
        assert response.status_code == 200
        data = response.get_json()
        assert data['success'] == True
        assert 'user_id' in data['data']
        assert 'username' in data['data']
        assert 'email' in data['data']
        assert 'bio' in data['data']
        assert 'profile_picture' in data['data']
    
    def test_get_profile_unauthorized(self, client):
        """TC-UP-02: Unauthenticated request returns 401 and should redirect to login"""
        response = client.get('/api/profile')
        assert response.status_code == 401
    
    def test_get_profile_returns_correct_data(self, client, mock_db, auth_token):
        """TC-UP-03: GET /api/profile returns correct user_id, username, email, bio, profile_picture fields"""
        token, user_id = auth_token
        headers = {"Authorization": f"Bearer {token}"}
        
        response = client.get('/api/profile', headers=headers)
        data = response.get_json()['data']
        
        assert data['username'] == 'testuser'
        assert data['email'] == 'test@example.com'
        assert data['bio'] == 'Test bio'


# ─── FR6.2: UPDATE PROFILE TESTS ───

class TestUpdateProfile:
    """Test FR6.2: Update profile fields (bio, username, email)"""
    
    def test_update_bio_success(self, client, mock_db, auth_token):
        """TC-UP-04: Successfully update user bio"""
        token, user_id = auth_token
        headers = {"Authorization": f"Bearer {token}"}
        
        response = client.patch(
            '/api/profile',
            json={"bio": "New bio"},
            headers=headers
        )
        
        assert response.status_code == 200
        data = response.get_json()
        assert data['success'] == True
        assert data['data']['bio'] == 'New bio'
    
    def test_update_username_success(self, client, mock_db, auth_token):
        """TC-UP-05: Successfully update user username"""
        token, user_id = auth_token
        headers = {"Authorization": f"Bearer {token}"}
        
        response = client.patch(
            '/api/profile',
            json={"username": "newusername"},
            headers=headers
        )
        
        assert response.status_code == 200
        data = response.get_json()
        assert data['data']['username'] == 'newusername'
    
    def test_update_email_success(self, client, mock_db, auth_token):
        """TC-UP-06: Successfully update user email and trigger verification flow"""
        token, user_id = auth_token
        headers = {"Authorization": f"Bearer {token}"}
        
        response = client.patch(
            '/api/profile',
            json={"email": "newemail@example.com"},
            headers=headers
        )
        
        assert response.status_code == 200
        data = response.get_json()
        assert data['data']['email'] == 'newemail@example.com'
    
    def test_update_partial_fields(self, client, mock_db, auth_token):
        """TC-UP-07: PATCH /api/profile correctly handles partial updates (only fields provided should update)"""
        token, user_id = auth_token
        headers = {"Authorization": f"Bearer {token}"}
        
        # Update only bio
        response = client.patch(
            '/api/profile',
            json={"bio": "Updated bio"},
            headers=headers
        )
        
        assert response.status_code == 200
        data = response.get_json()['data']
        
        # Bio should be updated
        assert data['bio'] == 'Updated bio'
        # Username should remain unchanged
        assert data['username'] == 'testuser'
        # Email should remain unchanged
        assert data['email'] == 'test@example.com'
    
    def test_username_already_taken(self, client, mock_db, auth_token):
        """TC-UP-08: Validate username uniqueness on update and return 409 if already taken"""
        token, user_id = auth_token
        headers = {"Authorization": f"Bearer {token}"}
        
        # Create another user with a username
        hashed_password = bcrypt.hashpw("Pass123".encode('utf-8'), bcrypt.gensalt())
        mock_db.users.insert_one({
            "username": "existinguser",
            "email": "existing@example.com",
            "password": hashed_password,
            "is_verified": True
        })
        
        # Try to update to existing username
        response = client.patch(
            '/api/profile',
            json={"username": "existinguser"},
            headers=headers
        )
        
        assert response.status_code == 409
        assert 'already taken' in response.get_json()['message'].lower()
    
    def test_invalid_email_format(self, client, mock_db, auth_token):
        """TC-UP-09: Validate email format on update and return 400 if invalid"""
        token, user_id = auth_token
        headers = {"Authorization": f"Bearer {token}"}
        
        response = client.patch(
            '/api/profile',
            json={"email": "invalidemail"},
            headers=headers
        )
        
        assert response.status_code == 400
        assert 'invalid' in response.get_json()['message'].lower()
    
    def test_email_already_registered(self, client, mock_db, auth_token):
        """TC-UP-10: Check email uniqueness and return 409 if already registered"""
        token, user_id = auth_token
        headers = {"Authorization": f"Bearer {token}"}
        
        # Create another user
        hashed_password = bcrypt.hashpw("Pass123".encode('utf-8'), bcrypt.gensalt())
        mock_db.users.insert_one({
            "username": "otheruser",
            "email": "other@example.com",
            "password": hashed_password,
            "is_verified": True
        })
        
        # Try to update to existing email
        response = client.patch(
            '/api/profile',
            json={"email": "other@example.com"},
            headers=headers
        )
        
        assert response.status_code == 409
    
    def test_update_profile_unauthorized(self, client):
        """TC-UP-11: Unauthenticated PATCH request returns 401"""
        response = client.patch(
            '/api/profile',
            json={"bio": "New bio"}
        )
        assert response.status_code == 401


# ─── FR7.3: PASSWORD CHANGE TESTS ───

class TestChangePassword:
    """Test FR7.3: Change password"""
    
    def test_change_password_success(self, client, mock_db, auth_token):
        """TC-UP-12: Successfully change password with correct current password"""
        token, user_id = auth_token
        headers = {"Authorization": f"Bearer {token}"}
        
        response = client.post(
            '/api/profile/password',
            json={
                "current_password": "TestPassword123",
                "new_password": "NewPassword123"
            },
            headers=headers
        )
        
        assert response.status_code == 200
        assert response.get_json()['success'] == True
    
    def test_incorrect_current_password(self, client, mock_db, auth_token):
        """TC-UP-13: POST /api/profile/password returns 400 when current password is incorrect"""
        token, user_id = auth_token
        headers = {"Authorization": f"Bearer {token}"}
        
        response = client.post(
            '/api/profile/password',
            json={
                "current_password": "WrongPassword",
                "new_password": "NewPassword123"
            },
            headers=headers
        )
        
        assert response.status_code == 400
        assert 'incorrect' in response.get_json()['message'].lower()
    
    def test_new_password_too_short(self, client, mock_db, auth_token):
        """TC-UP-14: Enforce minimum 8 characters on new_password and return 400 if not met"""
        token, user_id = auth_token
        headers = {"Authorization": f"Bearer {token}"}
        
        response = client.post(
            '/api/profile/password',
            json={
                "current_password": "TestPassword123",
                "new_password": "Short1"
            },
            headers=headers
        )
        
        assert response.status_code == 400
        assert 'at least 8' in response.get_json()['message'].lower()
    
    def test_change_password_unauthorized(self, client):
        """TC-UP-15: Unauthenticated POST /api/profile/password returns 401"""
        response = client.post(
            '/api/profile/password',
            json={
                "current_password": "TestPassword123",
                "new_password": "NewPassword123"
            }
        )
        assert response.status_code == 401


# ─── FR8: PICTURE UPLOAD TESTS ───

class TestProfilePictureUpload:
    """Test FR8: Upload profile picture"""
    
    def test_upload_valid_jpeg(self, client, mock_db, auth_token):
        """TC-UP-16: Successfully upload a valid JPEG profile picture"""
        token, user_id = auth_token
        headers = {"Authorization": f"Bearer {token}"}
        
        # Valid JPEG base64 (minimal valid JPEG)
        valid_jpeg = "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEA"
        
        response = client.post(
            '/api/profile/picture',
            json={"image": valid_jpeg},
            headers=headers
        )
        
        assert response.status_code == 200
        data = response.get_json()
        assert data['success'] == True
        assert 'profile_picture' in data['data']
    
    def test_upload_valid_png(self, client, mock_db, auth_token):
        """TC-UP-17: Successfully upload a valid PNG profile picture"""
        token, user_id = auth_token
        headers = {"Authorization": f"Bearer {token}"}
        
        valid_png = "data:image/png;base64,iVBORw0KGgoAAAANS"
        
        response = client.post(
            '/api/profile/picture',
            json={"image": valid_png},
            headers=headers
        )
        
        assert response.status_code == 200
        assert response.get_json()['success'] == True
    
    def test_invalid_file_type(self, client, mock_db, auth_token):
        """TC-UP-18: Validate uploaded file is JPG/PNG/JPEG and return 400 if invalid type"""
        token, user_id = auth_token
        headers = {"Authorization": f"Bearer {token}"}
        
        invalid_format = "data:application/pdf;base64,JVBERi0xLjQK"
        
        response = client.post(
            '/api/profile/picture',
            json={"image": invalid_format},
            headers=headers
        )
        
        assert response.status_code == 400
        assert 'only jpg/png/jpeg' in response.get_json()['message'].lower()
    
    def test_picture_upload_unauthorized(self, client):
        """TC-UP-19: Unauthenticated POST /api/profile/picture returns 401"""
        response = client.post(
            '/api/profile/picture',
            json={"image": "data:image/jpeg;base64,abc"}
        )
        assert response.status_code == 401


# ─── INTEGRATION TESTS ───

class TestProfileIntegration:
    """Test FR6, FR7, FR8: Full profile management flow"""
    
    def test_complete_profile_update_flow(self, client, mock_db, auth_token):
        """TC-UP-20: Complete profile update flow - bio, username, email, password, picture"""
        token, user_id = auth_token
        headers = {"Authorization": f"Bearer {token}"}
        
        # 1. Update bio
        response = client.patch(
            '/api/profile',
            json={"bio": "Updated bio"},
            headers=headers
        )
        assert response.status_code == 200
        
        # 2. Update username
        response = client.patch(
            '/api/profile',
            json={"username": "newusername"},
            headers=headers
        )
        assert response.status_code == 200
        
        # 3. Update email
        response = client.patch(
            '/api/profile',
            json={"email": "new@example.com"},
            headers=headers
        )
        assert response.status_code == 200
        
        # 4. Change password
        response = client.post(
            '/api/profile/password',
            json={
                "current_password": "TestPassword123",
                "new_password": "NewPassword123"
            },
            headers=headers
        )
        assert response.status_code == 200
        
        # 5. Verify all changes persisted
        response = client.get('/api/profile', headers=headers)
        data = response.get_json()['data']
        
        assert data['bio'] == 'Updated bio'
        assert data['username'] == 'newusername'
        assert data['email'] == 'new@example.com'
    
    def test_profile_changes_persist_in_database(self, client, mock_db, auth_token):
        """TC-UP-21: Profile changes actually saved to MongoDB database"""
        token, user_id = auth_token
        headers = {"Authorization": f"Bearer {token}"}
        
        # Update profile
        client.patch(
            '/api/profile',
            json={"bio": "Persisted bio"},
            headers=headers
        )
        
        # Check database directly
        user = mock_db.users.find_one({"_id": ObjectId(user_id)})
        assert user['bio'] == 'Persisted bio'


if __name__ == '__main__':
    pytest.main([__file__, '-v'])