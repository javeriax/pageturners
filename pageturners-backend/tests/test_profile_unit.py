#unit tests for profile management features in the backend of PageTurners
# Backend tests for profile management 
# Tests profile updates, password changes, picture uploads
# mapped to test strategy document (account management + api tests)

import pytest
import mongomock
from backend_app import app
from bson import ObjectId
import bcrypt

#CONSTANTS 
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

#GET PROFILE 
# tc-am-03 login + profile fetch validation
# tc-am-01 user registration state assumed

class TestGetProfile:

    # tc-am-03 login api + profile retrieval
    def test_get_profile_success(self, client, auth_token):
        """Successfully fetch user profile with all fields"""
        token, _ = auth_token
        response = client.get('/api/profile', headers=auth_headers(token))
        assert response.status_code == 200
        data = response.get_json()
        assert data['success'] == True
        for field in ('user_id', 'username', 'email', 'bio', 'profile_picture'):
            assert field in data['data']

    # tc-am-03 unauthorized access check
    def test_get_profile_unauthorized(self, client):
        """Unauthenticated request returns 401"""
        assert client.get('/api/profile').status_code == 401

    # tc-am-03 correct data validation
    def test_get_profile_returns_correct_data(self, client, auth_token):
        """Returns correct username, email, bio"""
        token, _ = auth_token
        data = client.get('/api/profile', headers=auth_headers(token)).get_json()['data']
        assert data['username'] == 'testuser'
        assert data['email'] == 'test@example.com'
        assert data['bio'] == 'Test bio'


#UPDATE PROFILE
# tc-am-07 update profile info
# tc-am-08 username uniqueness validation
# tc-am-02 duplicate email validation

class TestUpdateProfile:

    # tc-am-07 update bio
    def test_update_bio_success(self, client, auth_token):
        """Successfully update user bio"""
        token, _ = auth_token
        response = patch_profile(client, token, {"bio": "New bio"})
        assert response.status_code == 200
        assert response.get_json()['data']['bio'] == 'New bio'

    # tc-am-07 update username
    def test_update_username_success(self, client, auth_token):
        """Successfully update username"""
        token, _ = auth_token
        response = patch_profile(client, token, {"username": "newusername"})
        assert response.status_code == 200
        assert response.get_json()['data']['username'] == 'newusername'

    # tc-am-07 update email
    def test_update_email_success(self, client, auth_token):
        """Successfully update email"""
        token, _ = auth_token
        response = patch_profile(client, token, {"email": "newemail@example.com"})
        assert response.status_code == 200
        data = response.get_json()['data']
        assert data['email'] == 'test@example.com'  

    # tc-am-07 partial update
    def test_update_partial_fields(self, client, auth_token):
        """Partial update only changes provided fields"""
        token, _ = auth_token
        data = patch_profile(client, token, {"bio": "Updated bio"}).get_json()['data']
        assert data['bio'] == 'Updated bio'
        assert data['username'] == 'testuser'
        assert data['email'] == 'test@example.com'

    # tc-am-08 username already taken
    def test_username_already_taken(self, client, mock_db, auth_token):
        """Returns 409 if username already taken"""
        token, _ = auth_token
        create_extra_user(mock_db, "existinguser", "existing@example.com")
        response = patch_profile(client, token, {"username": "existinguser"})
        assert response.status_code == 409
        assert 'already taken' in response.get_json()['message'].lower()

    # tc-am-02 invalid email format
    def test_invalid_email_format(self, client, auth_token):
        """Returns 400 for invalid email format"""
        token, _ = auth_token
        response = patch_profile(client, token, {"email": "invalidemail"})
        assert response.status_code == 400
        assert 'invalid' in response.get_json()['message'].lower()

    # tc-am-02 email already exists
    def test_email_already_registered(self, client, mock_db, auth_token):
        """Returns 409 if email already registered"""
        token, _ = auth_token
        create_extra_user(mock_db, "otheruser", "other@example.com")
        response = patch_profile(client, token, {"email": "other@example.com"})
        assert response.status_code == 409

    # tc-am-03 unauthorized update
    def test_update_profile_unauthorized(self, client):
        """Unauthenticated PATCH returns 401"""
        assert client.patch('/api/profile', json={"bio": "New bio"}).status_code == 401


#CHANGE PASSWORD
# tc-am-11 change password flow

class TestChangePassword:

    # tc-am-11 successful password change
    def test_change_password_success(self, client, auth_token):
        """Successfully change password"""
        token, _ = auth_token
        response = post_password(client, token, TEST_PASSWORD, "NewPassword123")
        assert response.status_code == 200
        assert response.get_json()['success'] == True

    # tc-am-11 incorrect current password
    def test_incorrect_current_password(self, client, auth_token):
        """Returns 400 when current password is incorrect"""
        token, _ = auth_token
        response = post_password(client, token, "WrongPassword", "NewPassword123")
        assert response.status_code == 400
        assert 'incorrect' in response.get_json()['message'].lower()

    # tc-am-11 weak password validation
    def test_new_password_too_short(self, client, auth_token):
        """Returns 400 if new password under 8 characters"""
        token, _ = auth_token
        response = post_password(client, token, TEST_PASSWORD, "Short1")
        assert response.status_code == 400
        assert 'at least 8' in response.get_json()['message'].lower()

    # tc-am-03 unauthorized password change
    def test_change_password_unauthorized(self, client):
        """Unauthenticated POST returns 401"""
        assert client.post('/api/profile/password', json={
            "current_password": TEST_PASSWORD, "new_password": "NewPassword123"
        }).status_code == 401


# PICTURE UPLOAD
# tc-am-09 profile picture validation

class TestProfilePictureUpload:

    # tc-am-09 upload jpeg
    def test_upload_valid_jpeg(self, client, auth_token):
        """Successfully upload a valid JPEG"""
        token, _ = auth_token
        response = post_picture(client, token, VALID_JPEG)
        assert response.status_code == 200
        assert response.get_json()['success'] == True
        assert 'profile_picture' in response.get_json()['data']

    # tc-am-09 upload png
    def test_upload_valid_png(self, client, auth_token):
        """Successfully upload a valid PNG"""
        token, _ = auth_token
        response = post_picture(client, token, VALID_PNG)
        assert response.status_code == 200
        assert response.get_json()['success'] == True

    # tc-am-09 invalid file type
    def test_invalid_file_type(self, client, auth_token):
        """Returns 400 for invalid file type"""
        token, _ = auth_token
        response = post_picture(client, token, INVALID_PDF)
        assert response.status_code == 400
        assert 'only jpg/png/jpeg' in response.get_json()['message'].lower()

    # tc-am-03 unauthorized upload
    def test_picture_upload_unauthorized(self, client):
        """Unauthenticated POST returns 401"""
        assert client.post('/api/profile/picture', json={"image": VALID_JPEG}).status_code == 401


#INTEGRATION TESTS
# tc-am-07 full profile update flow

class TestProfileIntegration:

    # tc-am-07 full update flow
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
        assert data['email'] == 'test@example.com'

    # tc-am-07 db persistence check
    def test_profile_changes_persist_in_database(self, client, mock_db, auth_token):
        """Profile changes actually saved to MongoDB"""
        token, user_id = auth_token
        patch_profile(client, token, {"bio": "Persisted bio"})
        user = mock_db.users.find_one({"_id": ObjectId(user_id)})
        assert user['bio'] == 'Persisted bio'


if __name__ == '__main__':
    pytest.main([__file__, '-v'])