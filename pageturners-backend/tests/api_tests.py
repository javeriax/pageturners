#unit tests for API endpoints using pytest and Flask's test client
import bcrypt
from bson import ObjectId
from bson import ObjectId

# LOGIN TESTS
# TC-API-01 LOGIN API INTEGRATION
def test_login_success(client, mock_db):
    hashed = bcrypt.hashpw("Password123".encode(), bcrypt.gensalt())

    mock_db.users.insert_one({
        "email": "test@example.com",
        "password": hashed,
        "is_verified": True
    })

    response = client.post("/api/auth/login", json={
        "email": "test@example.com",
        "password": "Password123"
    })

    data = response.get_json()

    assert response.status_code == 200
    assert data["success"] is True
    assert "token" in data


# TC-API-02 AUTH REQUIRED FOR PROTECTED ENDPOINTS
def test_dashboard_requires_auth(client):
    response = client.get("/api/dashboard/")  # FIXED trailing slash

    assert response.status_code in [401, 302, 308]


# TC-API-03 SEARCH STRUCTURE
def test_search_books_structure(client, auth_headers):
    response = client.get(
        "/api/dashboard/?search=harry",
        headers=auth_headers
    )

    assert response.status_code == 200
    data = response.get_json()

    if data.get("data"):
        book = data["data"][0]
        assert "title" in book
        assert "author" in book
        assert "genre" in book
        assert "rating" in book
        assert "cover_image" in book


# TC-API-04 REVIEW API INTEGRATION
def test_submit_review(client, auth_headers, book_id):
    response = client.post(
        f"/api/books/{book_id}/reviews",
        headers=auth_headers,
        json={
            "rating": 5,
            "review_text": "Great!"
        }
    )

    assert response.status_code in [200, 201]

# TC-API-05 DELETE REVIEW
def test_delete_review(client, auth_headers):
    review_id = ObjectId()

    response = client.delete(
        f"/api/reviews/{review_id}",
        headers=auth_headers
    )

    assert response.status_code in [200, 404, 403]


# TC-API-06 ADD TO LIBRARY
def test_add_book_to_library(client, auth_headers, book_id):
    response = client.post(
        "/api/library/add",
        headers=auth_headers,
        json={"book_id": str(book_id)}
    )

    assert response.status_code == 201

    # duplicate test
    response2 = client.post(
        "/api/library/add",
        headers=auth_headers,
        json={"book_id": str(book_id)}
    )

    assert response2.status_code == 409

# TC-API-07 PROGRESS VALIDATION
def test_update_progress_validation(client, auth_headers, book_id, mock_db):

    mock_db.user_library.insert_one({
    "user_id": ObjectId("69ece176b4cf7ba665d0550b"),
    "book_id": book_id,
    "current_page": 10,
    "status": "currently reading"
})

    response = client.patch(
        f"/api/library/{book_id}/progress",
        headers=auth_headers,
        json={"current_page": 9999}
    )

    assert response.status_code == 400

