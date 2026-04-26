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

# TC-BD-01: Search by Title
def test_search_by_title(client, mock_db, auth_header):
    mock_db.books.insert_one({"title": "Harry Potter and the Prisoner", "author_name": "JK Rowling"})
    
    # Testing split-word logic
    response = client.get('/api/books?search=Harry+Prisoner', headers=auth_header)
    data = response.get_json()
    
    assert response.status_code == 200
    assert len(data["data"]) == 1
    assert "Prisoner" in data["data"][0]["title"]

# TC-BD-02: Search by Author
def test_search_by_author(client, mock_db, auth_header):
    mock_db.books.insert_one({"title": "The Hobbit", "author_name": "J.R.R. Tolkien"})
    
    response = client.get('/api/books?search=Tolkien', headers=auth_header)
    data = response.get_json()
    
    assert response.status_code == 200
    assert data["data"][0]["author_name"] == "J.R.R. Tolkien"

# TC-BD-03: Single Genre Filter
def test_single_genre_filter(client, mock_db, auth_header):
    mock_db.books.insert_many([
        {"title": "Book 1", "genre": ["Fantasy"]},
        {"title": "Book 2", "genre": ["Romance"]}
    ])
    
    response = client.get('/api/books?genre=Fantasy', headers=auth_header)
    data = response.get_json()
    
    assert len(data["data"]) == 1
    assert data["data"][0]["genre"] == ["Fantasy"]

# TC-BD-04: Multi-Genre Filter (AND Logic) 
def test_genre_filter_multi(client, mock_db, auth_header):
    mock_db.books.insert_many([
        {"title": "Book A", "genre": ["Fantasy", "Romance"]},
        {"title": "Book B", "genre": ["Fantasy"]}
    ])
    
    response = client.get('/api/books?genre=Fantasy,Romance', headers=auth_header)
    data = response.get_json()
    
    # Should only return Book A because it has BOTH
    assert len(data["data"]) == 1
    assert data["data"][0]["title"] == "Book A"

# TC-BD-05: Combined Search and Filter
def test_combined_search_and_filter(client, mock_db, auth_header):
    mock_db.books.insert_many([
        {"title": "Magic Kingdom", "genre": ["Fantasy"]},
        {"title": "Magic Love", "genre": ["Romance"]}
    ])
    
    response = client.get('/api/books?search=Magic&genre=Fantasy', headers=auth_header)
    data = response.get_json()
    
    assert len(data["data"]) == 1
    assert data["data"][0]["title"] == "Magic Kingdom"

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

# TC-BD-07: Empty Search Results
def test_empty_search_results(client, mock_db, auth_header):
    response = client.get('/api/books?search=NonExistentBook123', headers=auth_header)
    data = response.get_json()
    
    assert response.status_code == 200
    assert len(data["data"]) == 0
    # Your backend should return a 200 with an empty list and a message
    assert "data" in data

# TC-API-03: API Response Structure 
def test_api_structure(client, mock_db, auth_header):
    mock_db.books.insert_one({
        "title": "Test", 
        "author_name": "Author", 
        "genre": ["G"],
        "cover_image": "img.jpg",
        "avg_rating": 4.0
    })
    
    response = client.get('/api/books?search=Test', headers=auth_header)
    book = response.get_json()["data"][0]
    
    # Check for fields required by TC-API-03 
    assert "book_id" in book
    assert "title" in book
    assert "author_name" in book
    assert "genre" in book
    assert "cover_image" in book