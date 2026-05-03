# test_book_details_unit.py
from bson import ObjectId
# book details tests
# tc-bd-06: view book detail completeness
def test_book_details_success(client, mock_db, auth_header):
    book_id = ObjectId()

    mock_db.books.insert_one({
        "_id": book_id,
        "title": "Detailed Book",
        "author_name": "Author X",
        "genre": ["Sci-Fi"],
        "synopsis": "A great story",
        "total_pages": 400
    })

    response = client.get(f"/api/books/{book_id}", headers=auth_header)
    data = response.get_json()

    assert response.status_code == 200
    assert data["success"] is True
    assert data["data"]["title"] == "Detailed Book"


# tc-bd-06: book not found case
def test_book_details_not_found(client, mock_db, auth_header):
    fake_id = ObjectId()

    response = client.get(f"/api/books/{fake_id}", headers=auth_header)
    data = response.get_json()

    assert response.status_code == 404
    assert data["success"] is False


# tc-api-02: protected api without token
def test_book_details_without_token(client):
    book_id = ObjectId()

    response = client.get(f"/api/books/{book_id}")

    assert response.status_code == 401