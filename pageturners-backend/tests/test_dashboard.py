import pytest
import mongomock
from backend_app import app
from flask_jwt_extended import create_access_token
from bson import ObjectId

@pytest.fixture
def client():
    app.config['TESTING'] = True
    # Long key to satisfy SHA256 requirements
    app.config['JWT_SECRET_KEY'] = 'a_very_long_and_extremely_secure_test_secret_key_32_chars'
    with app.test_client() as client:
        yield client

@pytest.fixture
def auth_header():
    with app.app_context():
        token = create_access_token(identity="testuser@example.com")
        return {'Authorization': f'Bearer {token}'}

@pytest.fixture(autouse=True)
def mock_db(monkeypatch):
    # 1. Create a fresh mock client for every single test
    mock_client = mongomock.MongoClient()
    mock_database = mock_client["pageturners_test"]
    
    # 2. Directly overwrite the db attribute on the app object..
    monkeypatch.setattr(app, "db", mock_database)
    
    # 3. Explicitly clear collections to prevent leakage
    mock_database.books.delete_many({})
    mock_database.reviews.delete_many({})
    
    return mock_database


# TC-BD-01: search by title
def test_search_by_title(client, mock_db, auth_header):
    mock_db.books.insert_one({
        "title": "Harry Potter and the Prisoner", 
        "author_name": "JK Rowling"
    })
    
    # Use the dashboard-specific search endpoint
    response = client.get('/api/dashboard/?search=Harry', headers=auth_header)
    data = response.get_json()
    
    assert response.status_code == 200
    assert len(data["data"]) == 1
    assert "Harry" in data["data"][0]["title"]

# TC-BD-02: search by author
def test_search_by_author(client, mock_db, auth_header):
    mock_db.books.insert_one({
        "title": "The Hobbit", 
        "author_name": "J.R.R. Tolkien"
    })
    
    response = client.get('/api/dashboard/?search=Tolkien', headers=auth_header)
    data = response.get_json()
    
    assert response.status_code == 200
    assert "Tolkien" in data["data"][0]["author_name"]

# TC-BD-03: single genre filter
def test_single_genre_filter(client, mock_db, auth_header):
    mock_db.books.insert_many([
        {"title": "Book 1", "genre": ["Fantasy"]},
        {"title": "Book 2", "genre": ["Romance"]}
    ])
    
    response = client.get('/api/dashboard/?genre=Fantasy', headers=auth_header)
    data = response.get_json()
    
    #should hould be exactly 1 if the mock_db was cleared correctly
    assert len(data["data"]) == 1
    assert "Fantasy" in data["data"][0]["genre"]

# TC-BD-04: multi-genre filter
def test_genre_filter_multi(client, mock_db, auth_header):
    mock_db.books.insert_many([
        {"title": "Book A", "genre": ["Fantasy", "Romance"]},
        {"title": "Book B", "genre": ["Fantasy"]}
    ])
    
    # API logic requires ALL selected genres to match
    response = client.get('/api/dashboard/?genre=Fantasy,Romance', headers=auth_header)
    data = response.get_json()
    
    assert len(data["data"]) == 1
    assert data["data"][0]["title"] == "Book A"

# test_get_genres_list: genres list retrieval
def test_get_genres_list(client, mock_db, auth_header):
    mock_db.books.insert_many([
        {"title": "B1", "genre": ["Sci-Fi"]},
        {"title": "B2", "genre": ["Fantasy"]},
        {"title": "B3", "genre": ["Sci-Fi"]}
    ])
    
    response = client.get('/api/dashboard/genres', headers=auth_header)
    data = response.get_json()
    
    assert response.status_code == 200
    # verify unique, sorted output
    assert data["data"] == ["Fantasy", "Sci-Fi"]