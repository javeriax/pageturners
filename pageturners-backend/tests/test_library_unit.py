# unit tests for library management features using pytest and Flask's test client

import pytest
from bson import ObjectId
from datetime import datetime


# TC-PL-01: add book to library
def test_add_book_to_library(client, auth_headers, mock_db):
    book_id = ObjectId()
    mock_db["books"].insert_one({"_id": book_id, "total_pages": 300})

    response = client.post(
        "/api/library/add",
        headers=auth_headers,
        json={"book_id": str(book_id)}
    )

    assert response.status_code == 201
    assert response.get_json()["success"] is True


# TC-PL-02: update reading status
def test_update_status(client, auth_headers, mock_db):
    book_id = ObjectId()

    mock_db["user_library"].insert_one({
        "user_id": ObjectId(auth_headers["user_id"]),
        "book_id": book_id,
        "status": "want to read",
        "added_at": datetime.utcnow()
    })

    response = client.patch(
        f"/api/library/{book_id}/status",
        headers=auth_headers,
        json={"status": "completed"}
    )

    assert response.status_code == 200
    assert response.get_json()["data"]["status"] == "completed"


# TC-PL-03: update reading progress
def test_update_progress_success(client, auth_headers, mock_db):
    book_id = ObjectId()

    mock_db["books"].insert_one({
        "_id": book_id,
        "total_pages": 300
    })

    mock_db["user_library"].insert_one({
        "user_id": ObjectId(auth_headers["user_id"]),
        "book_id": book_id,
        "status": "currently reading",
        "added_at": datetime.utcnow()
    })

    response = client.patch(
        f"/api/library/{book_id}/progress",
        headers=auth_headers,
        json={"current_page": 120}
    )

    assert response.status_code == 200
    assert response.get_json()["data"]["current_page"] == 120


# TC-PL-03B: block progress update for completed books
def test_completed_book_progress_blocked(client, auth_headers, mock_db):
    book_id = ObjectId()

    mock_db["books"].insert_one({
        "_id": book_id,
        "total_pages": 300
    })

    mock_db["user_library"].insert_one({
        "user_id": ObjectId(auth_headers["user_id"]),
        "book_id": book_id,
        "status": "completed",
        "added_at": datetime.utcnow()
    })

    response = client.patch(
        f"/api/library/{book_id}/progress",
        headers=auth_headers,
        json={"current_page": 50}
    )

    assert response.status_code in [400, 403]


# TC-PL-04: progress validation (overflow)
def test_progress_page_overflow(client, auth_headers, mock_db):
    book_id = ObjectId()

    mock_db["books"].insert_one({
        "_id": book_id,
        "total_pages": 300
    })

    mock_db["user_library"].insert_one({
        "user_id": ObjectId(auth_headers["user_id"]),
        "book_id": book_id,
        "status": "currently reading",
        "added_at": datetime.utcnow()
    })

    response = client.patch(
        f"/api/library/{book_id}/progress",
        headers=auth_headers,
        json={"current_page": 9999}
    )

    assert response.status_code == 400


# TC-PL-05: progress display logic
def test_progress_display_logic(client, auth_headers, mock_db):
    book_id = ObjectId()

    mock_db["books"].insert_one({
        "_id": book_id,
        "total_pages": 300
    })

    mock_db["user_library"].insert_one({
        "user_id": ObjectId(auth_headers["user_id"]),
        "book_id": book_id,
        "current_page": 150,
        "status": "currently reading",
        "added_at": datetime.utcnow()
    })

    response = client.get("/api/library/", headers=auth_headers)

    assert response.status_code == 200
    data = response.get_json()["data"]

    assert isinstance(data, list)
    assert any("current_page" in book for book in data)


# TC-PL-06: dashboard grouping
def test_dashboard_grouping(client, auth_headers, mock_db):
    book_id = ObjectId()

    mock_db["user_library"].insert_one({
        "user_id": ObjectId(auth_headers["user_id"]),
        "book_id": book_id,
        "status": "currently reading",
        "current_page": 50,
        "added_at": datetime.utcnow()
    })

    response = client.get("/api/library/", headers=auth_headers)

    assert response.status_code == 200
    assert "data" in response.get_json()


# TC-PL-07: duplicate book prevention
def test_duplicate_book_prevention(client, auth_headers, mock_db):
    book_id = ObjectId()

    user_id = auth_headers["user_id"]  # keep as string for consistency with JWT identity

    mock_db["books"].insert_one({
        "_id": book_id,
        "total_pages": 300
    })

    mock_db["user_library"].insert_one({
        "user_id": ObjectId(user_id),   # convert ONLY here
        "book_id": book_id,
        "status": "want to read",
        "added_at": datetime.utcnow()
    })

    response = client.post(
        "/api/library/add",
        headers=auth_headers,
        json={"book_id": str(book_id)}
    )

    assert response.status_code == 409