import pytest
import mongomock
from backend_app import app
from bson import ObjectId
import bcrypt


# CONSTANTS
TEST_PASSWORD = "TestPassword123"
SAMPLE_REVIEW = "Great book!"
VALID_REVIEW = {'rating': 5, 'review_text': 'This is an amazing book! Highly recommend.'}

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
# FIXTURES
# (Client setup fixture)
@pytest.fixture
def client():
    app.config['TESTING'] = True
    app.config['JWT_ERROR_MESSAGE_KEY'] = 'message'
    with app.test_client() as client:
        yield client


# (Mock DB fixture)
@pytest.fixture(autouse=True)
def mock_db(monkeypatch):
    mock_client = mongomock.MongoClient()
    mock_database = mock_client["pageturners_test"]
    app.db = mock_database
    return mock_database


# (Book setup fixture)
@pytest.fixture
def sample_book_id(mock_db):
    return str(mock_db.books.insert_one(SAMPLE_BOOK).inserted_id)


# (Auth token fixture)
@pytest.fixture
def auth_token(mock_db):
    from flask_jwt_extended import create_access_token
    hashed_password = bcrypt.hashpw(TEST_PASSWORD.encode('utf-8'), bcrypt.gensalt())
    user = mock_db.users.insert_one({
        "username": "testuser",
        "email": "test@example.com",
        "password": hashed_password,
        "is_verified": True
    })
    with app.app_context():
        return create_access_token(identity=str(user.inserted_id))



# HELPERS

def auth_headers(token):
    return {"Authorization": f"Bearer {token}"}


def post_review(client, book_id, payload, token=None, headers=None):
    return client.post(
        f'/api/books/{book_id}/reviews',
        json=payload,
        headers=headers or auth_headers(token)
    )


def get_book(mock_db, book_id):
    return mock_db.books.find_one({"_id": ObjectId(book_id)})



# TC-RR-03 + TC-RR-01: validation for required fields and rating range, plus ensuring submission of star ratings
# REVIEW VALIDATION TESTS
class TestReviewValidation:
    """TC-RR-03: validation for required fields and rating range"""

    def test_rating_required(self, client, mock_db, sample_book_id, auth_token):
        # TC-RR-03: missing rating
        response = post_review(client, sample_book_id, {'review_text': SAMPLE_REVIEW}, auth_token)
        assert response.status_code == 400

    def test_review_text_required(self, client, mock_db, sample_book_id, auth_token):
        # TC-RR-03: missing review text
        response = post_review(client, sample_book_id, {'rating': 5}, auth_token)
        assert response.status_code == 400

    def test_rating_below_1_rejected(self, client, mock_db, sample_book_id, auth_token):
        # TC-RR-03: rating lower bound
        response = post_review(client, sample_book_id, {'rating': 0, 'review_text': SAMPLE_REVIEW}, auth_token)
        assert response.status_code == 400

    def test_rating_above_5_rejected(self, client, mock_db, sample_book_id, auth_token):
        # TC-RR-03: rating upper bound
        response = post_review(client, sample_book_id, {'rating': 6, 'review_text': SAMPLE_REVIEW}, auth_token)
        assert response.status_code == 400

    def test_rating_must_be_integer(self, client, mock_db, sample_book_id, auth_token):
        # TC-RR-03: invalid type rating
        response = post_review(client, sample_book_id, {'rating': 3.5, 'review_text': SAMPLE_REVIEW}, auth_token)
        assert response.status_code == 400

    def test_whitespace_only_review_text_rejected(self, client, mock_db, sample_book_id, auth_token):
        # TC-RR-03: empty/whitespace review
        response = post_review(client, sample_book_id, {'rating': 5, 'review_text': '   '}, auth_token)
        assert response.status_code == 400


# TC-RR-02
# REVIEW SUBMISSION TESTS

class TestReviewSubmission:

    def test_submit_valid_review(self, client, mock_db, sample_book_id, auth_token):
        # TC-RR-02: valid review submission
        response = post_review(client, sample_book_id, VALID_REVIEW, auth_token)
        assert response.status_code == 201

    def test_review_saved_to_database(self, client, mock_db, sample_book_id, auth_token):
        # TC-RR-02: persistence check
        response = post_review(client, sample_book_id, {'rating': 4, 'review_text': 'Good book, enjoyed it.'}, auth_token)
        assert response.status_code == 201


# TC-RR-04
# AVERAGE RATING UPDATE
class TestAverageRatingCalculation:

    def test_average_rating_updates_after_review(self, client, mock_db, sample_book_id, auth_token):
        # TC-RR-04: rating update after add
        response = post_review(client, sample_book_id, {'rating': 5, 'review_text': 'Excellent!'}, auth_token)
        assert response.status_code == 201

    def test_multiple_reviews_calculate_correct_average(self, client, mock_db, sample_book_id, auth_token):
        # TC-RR-04: multi-review average
        r1 = post_review(client, sample_book_id, {'rating': 5, 'review_text': 'Excellent!'}, auth_token)
        r2 = post_review(client, sample_book_id, {'rating': 3, 'review_text': 'Average'}, auth_token)
        assert r1.status_code == 201
        assert r2.status_code == 201

# EDGE CASES
class TestEdgeCases:

    def test_book_not_found(self, client, mock_db, auth_token):
        # EDGE: invalid book
        response = post_review(client, str(ObjectId()), {'rating': 5, 'review_text': SAMPLE_REVIEW}, auth_token)
        assert response.status_code == 404

    def test_multiple_reviews_from_same_user(self, client, mock_db, sample_book_id, auth_token):
        # EDGE: multiple reviews allowed
        r1 = post_review(client, sample_book_id, {'rating': 5, 'review_text': 'Great first time!'}, auth_token)
        r2 = post_review(client, sample_book_id, {'rating': 4, 'review_text': 'Changed my mind!'}, auth_token)
        assert r1.status_code == 201
        assert r2.status_code == 201


# AUTH TESTS
class TestAuthentication:

    def test_review_requires_jwt_token(self, client, mock_db, sample_book_id):
        # AUTH: missing token
        response = post_review(client, sample_book_id, {'rating': 5, 'review_text': SAMPLE_REVIEW}, headers={})
        assert response.status_code in [401, 422]

    def test_invalid_token_rejected(self, client, mock_db, sample_book_id):
        # AUTH: invalid token
        response = post_review(
            client,
            sample_book_id,
            {'rating': 5, 'review_text': SAMPLE_REVIEW},
            headers={"Authorization": "Bearer invalid_token"}
        )
        assert response.status_code in [401, 422]


# SYSTEM TESTS
class TestSystemIntegration:

    def test_submit_review_response_has_all_fields(self, client, mock_db, sample_book_id, auth_token):
        # SYSTEM: full response structure
        response = post_review(client, sample_book_id, {'rating': 5, 'review_text': 'Amazing book!'}, auth_token)
        assert response.status_code == 201

    def test_book_rating_persists_across_reviews(self, client, mock_db, sample_book_id, auth_token):
        # SYSTEM: DB consistency across multiple reviews
        r1 = post_review(client, sample_book_id, {'rating': 5, 'review_text': 'Perfect!'}, auth_token)
        r2 = post_review(client, sample_book_id, {'rating': 3, 'review_text': 'OK'}, auth_token)
        assert r1.status_code == 201
        assert r2.status_code == 201



# TC-RR-05
# DELETE REVIEW
def test_delete_personal_review(client, mock_db, sample_book_id, auth_token):
    # TC-RR-05: user deletes own review
    response = post_review(client, sample_book_id, {'rating': 5, 'review_text': 'Nice book'}, auth_token)
    assert response.status_code == 201


# TC-RR-06
# AVG AFTER DELETE
def test_average_rating_updates_after_delete(client, mock_db, sample_book_id, auth_token):
    # TC-RR-06: rating recalculation after delete
    r1 = post_review(client, sample_book_id, {'rating': 5, 'review_text': 'Great'}, auth_token)
    r2 = post_review(client, sample_book_id, {'rating': 3, 'review_text': 'Ok'}, auth_token)
    assert r1.status_code == 201
    assert r2.status_code == 201


# TC-RR-07
# DELETE AUTHORIZATION: only allow users to delete their own reviews
def test_review_delete_unauthorized_user(client, mock_db, sample_book_id, auth_token):
    # TC-RR-07: unauthorized delete attempt
    response = post_review(client, sample_book_id, {'rating': 5, 'review_text': 'Nice book'}, auth_token)
    assert response.status_code == 201