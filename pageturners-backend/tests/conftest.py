# pytest fixtures for unit tests, including a mock MongoDB instance and an auth header with a valid JWT token for testing protected routes
import pytest
import mongomock
from backend_app import app
from flask_jwt_extended import create_access_token
from bson import ObjectId
import bcrypt

# CLIENT FIXTURE
import pytest
import mongomock
from backend_app import app
from flask_jwt_extended import create_access_token
from bson import ObjectId
import bcrypt

# CLIENT FIXTURE
@pytest.fixture
def client():
    app.config['TESTING'] = True
    app.config['JWT_SECRET_KEY'] = 'this-is-a-very-secure-test-secret-key-123'
    app.config['JWT_ERROR_MESSAGE_KEY'] = 'message'
    
    with app.test_client() as client:
        yield client


# MOCK DATABASE 
@pytest.fixture(autouse=True)
def mock_db(monkeypatch):
    mock_client = mongomock.MongoClient()
    mock_database = mock_client["pageturners_test"]

    monkeypatch.setattr("backend_app.db", mock_database)

    with app.app_context():
        app.db = mock_database

    return mock_database


# AUTH HEADERS (single unified one)
@pytest.fixture
def auth_headers(test_user):
    with app.app_context():
        token = create_access_token(identity=test_user)
    return {
        "Authorization": f"Bearer {token}",
        "user_id": str(test_user)
    }


# TEST USER (shared across ALL tests)
TEST_PASSWORD = "TestPassword123"

TEST_USER = {
    "_id": ObjectId("69ece176b4cf7ba665d0550b"),
    "username": "testuser",
    "email": "test@example.com",
    "bio": "Test bio",
    "profile_picture": "",
    "is_verified": True
}

@pytest.fixture
def test_user(mock_db):
    hashed_password = bcrypt.hashpw(TEST_PASSWORD.encode('utf-8'), bcrypt.gensalt())
    user_data = {**TEST_USER, "password": hashed_password}
    mock_db.users.insert_one(user_data)
    return str(TEST_USER["_id"])


# BOOK FIXTURE (existing)
@pytest.fixture
def book_id(mock_db):
    book_id = ObjectId()

    mock_db.books.insert_one({
        "_id": book_id,
        "title": "Test Book",
        "author": "Author A",
        "genre": "Fantasy",
        "rating": 4,
        "total_pages": 309
    })

    return book_id


# REVIEW-SPECIFIC FIXTURES (moved cleanly)

SAMPLE_BOOK = {
    "title": "Test Book",
    "author_name": "Test Author",
    "genre": ["Fiction"],
    "synopsis": "A test book for reviews",
    "total_pages": 300,
    "release_date": "2020-01-01",
    "cover_image": "test.jpg",
    "avg_rating": 0,
    "review_count": 0,
    "reviews": []
}
# REVIEW TEST FIXTURES
@pytest.fixture
def sample_book_id(mock_db):
    return str(mock_db.books.insert_one(SAMPLE_BOOK).inserted_id)

#token tied to actual DB user (for profile tests)
@pytest.fixture
def auth_token(test_user):
    with app.app_context():
        token = create_access_token(identity=test_user)
    return token, test_user

