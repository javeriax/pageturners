import pytest
import mongomock
import re
from backend_app import app
from flask_jwt_extended import create_access_token
from bson import ObjectId

@pytest.fixture
def client():
    app.config['TESTING'] = True
    app.config['JWT_SECRET_KEY'] = 'test-secret'
    with app.test_client() as client:
        yield client

@pytest.fixture
def auth_header():
    with app.app_context():
        token = create_access_token(identity="testuser@example.com")
        return {'Authorization': f'Bearer {token}'}

@pytest.fixture(autouse=True)
def mock_db(monkeypatch):
    mock_client = mongomock.MongoClient()
    mock_database = mock_client["pageturners_test"]
    monkeypatch.setattr("backend_app.db", mock_database)
    return mock_database


# TC-BD-06: View Book Detail Completeness
def test_book_details_api(client, mock_db, auth_header):
    book_id = str(ObjectId())
    mock_db.books.insert_one({
        "_id": ObjectId(book_id),
        "title": "Detailed Book",
        "author_name": "Author X",
        "genre": ["Sci-Fi"],
        "synopsis": "A great story",
        "total_pages": 400
    })
    
    response = client.get(f'/api/books/{book_id}', headers=auth_header)
    data = response.get_json()
    
    assert response.status_code == 200
    assert data["data"]["title"] == "Detailed Book"
    assert data["data"]["total_pages"] == 400
    assert "synopsis" in data["data"]

