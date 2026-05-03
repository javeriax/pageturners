from backend_app import app
from flask_jwt_extended import create_access_token
from bson import ObjectId

#tc-BD-06 is in test_book_details_unit.py since it focuses on the book details endpoint, not the dashboard search/genre filter functionality.

#tc-BD-01: search by title
def test_search_by_title(client, mock_db, auth_headers):
    mock_db.books.insert_one({
        "title": "Harry Potter and the Prisoner", 
        "author_name": "JK Rowling"
    })
    
    # Use the dashboard-specific search endpoint
    response = client.get('/api/dashboard/?search=Harry', headers=auth_headers)
    data = response.get_json()
    
    assert response.status_code == 200
    assert len(data["data"]) == 1
    assert "Harry" in data["data"][0]["title"]

#tc-BD-02: search by author
def test_search_by_author(client, mock_db, auth_headers):
    mock_db.books.insert_one({
        "title": "The Hobbit", 
        "author_name": "J.R.R. Tolkien"
    })
    
    response = client.get('/api/dashboard/?search=Tolkien', headers=auth_headers)
    data = response.get_json()
    
    assert response.status_code == 200
    assert "Tolkien" in data["data"][0]["author_name"]

# tc-BD-03: single genre filter
def test_single_genre_filter(client, mock_db, auth_headers):
    mock_db.books.insert_many([
        {"title": "Book 1", "genre": ["Fantasy"]},
        {"title": "Book 2", "genre": ["Romance"]}
    ])
    
    response = client.get('/api/dashboard/?genre=Fantasy', headers=auth_headers)
    data = response.get_json()
    
    #should hould be exactly 1 if the mock_db was cleared correctly
    assert len(data["data"]) == 1
    assert "Fantasy" in data["data"][0]["genre"]

# tc-BD-04: multi-genre filter
def test_genre_filter_multi(client, mock_db, auth_headers):
    mock_db.books.insert_many([
        {"title": "Book A", "genre": ["Fantasy", "Romance"]},
        {"title": "Book B", "genre": ["Fantasy"]}
    ])
    
    # API logic requires ALL selected genres to match
    response = client.get('/api/dashboard/?genre=Fantasy,Romance', headers=auth_headers)
    data = response.get_json()
    
    assert len(data["data"]) == 1
    assert data["data"][0]["title"] == "Book A"

# test_get_genres_list: genres list retrieval
def test_get_genres_list(client, mock_db, auth_headers):
    mock_db.books.insert_many([
        {"title": "B1", "genre": ["Sci-Fi"]},
        {"title": "B2", "genre": ["Fantasy"]},
        {"title": "B3", "genre": ["Sci-Fi"]}
    ])
    
    response = client.get('/api/dashboard/genres', headers=auth_headers) 
    data = response.get_json()
    
    assert response.status_code == 200
    # verify unique, sorted output
    assert data["data"] == ["Fantasy", "Sci-Fi"]

# tc-bd-05: combined search and genre filter
def test_combined_search_and_filter(client, mock_db, auth_headers):
    mock_db.books.insert_many([
        {"title": "Harry Potter", "author_name": "JK Rowling", "genre": ["Fantasy"]},
        {"title": "Harry Science", "author_name": "Someone", "genre": ["Sci-Fi"]},
        {"title": "Random Book", "author_name": "JK Rowling", "genre": ["Fantasy"]}
    ])

    response = client.get(
        '/api/dashboard/?search=Harry&genre=Fantasy',
        headers=auth_headers
    )
    data = response.get_json()

    assert response.status_code == 200
    assert len(data["data"]) == 1
    assert data["data"][0]["title"] == "Harry Potter"

# tc-bd-07: empty search results
def test_empty_search_results(client, mock_db, auth_headers):    
    mock_db.books.insert_one({
        "title": "Some Book",
        "author_name": "Known Author",
        "genre": ["Fantasy"]
    })

    response = client.get(
        '/api/dashboard/?search=NonExistentBookXYZ',
        headers=auth_headers
    )

    data = response.get_json()

    assert response.status_code == 200
    assert data["data"] == []
    assert data["success"] is True


#tc-api-03: search response structure
#this test verifies that the search endpoint returns the expected fields in the response:
def test_search_response_structure(client, mock_db, auth_headers):
    mock_db.books.insert_one({
        "title": "Harry Potter",
        "author_name": "J.K. Rowling",
        "genre": ["Fantasy"],
        "rating": 4.5,
        "cover_image": "img.jpg"
    })

    response = client.get('/api/dashboard/?search=Harry', headers=auth_headers)
    data = response.get_json()

    assert response.status_code == 200

    book = data["data"][0]

    assert "title" in book
    assert "author_name" in book
    assert "genre" in book