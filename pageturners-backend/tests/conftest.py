#pytest fixtures for unit tests, including a mock MongoDB instance and an auth header with a valid JWT token for testing protected routes:
import pytest
import mongomock
from backend_app import app
from flask_jwt_extended import create_access_token
from bson import ObjectId
from flask_jwt_extended import create_access_token
from backend_app import app
from bson import ObjectId

@pytest.fixture
def client():
    app.config['TESTING'] = True
    app.config['JWT_SECRET_KEY'] = 'this-is-a-very-secure-test-secret-key-123'
    
    with app.test_client() as client:
        yield client


@pytest.fixture
def auth_header():
    with app.app_context():
        token = create_access_token(identity="testuser@example.com")
        return {"Authorization": f"Bearer {token}"}


@pytest.fixture(autouse=True)
def mock_db(monkeypatch):
    mock_client = mongomock.MongoClient()
    mock_database = mock_client["pageturners_test"]

    # patch backend_app.db
    monkeypatch.setattr("backend_app.db", mock_database)

    # patch current_app.db
    with app.app_context():
        app.db = mock_database

    return mock_database


#FIXTURE: USER ID AND TOKEN
@pytest.fixture
def auth_headers():
    with app.app_context():
        user_id = '69ece176b4cf7ba665d0550b'  # REAL ObjectId
        token = create_access_token(identity=str(user_id))
    return {
        "Authorization": f"Bearer {token}",
        "user_id": str(user_id)   # optional helper if needed
    }

# FIXTURE: TEST BOOK ID
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