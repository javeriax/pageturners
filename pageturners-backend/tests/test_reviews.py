import pytest
import mongomock
from backend_app import app
from bson import ObjectId
import bcrypt

#  CONSTANTS 

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

#  FIXTURES 

@pytest.fixture
def client():
    app.config['TESTING'] = True
    app.config['JWT_ERROR_MESSAGE_KEY'] = 'message'
    with app.test_client() as client:
        yield client

@pytest.fixture(autouse=True)
def mock_db(monkeypatch):
    mock_client = mongomock.MongoClient()
    mock_database = mock_client["pageturners_test"]
    app.db = mock_database
    return mock_database

@pytest.fixture
def sample_book_id(mock_db):
    return str(mock_db.books.insert_one(SAMPLE_BOOK).inserted_id)

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

#  HELPERS 

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


#  UNIT TESTS: Validation 

class TestReviewValidation:
    """Input validation for review submission"""

    def test_rating_required(self, client, mock_db, sample_book_id, auth_token):
        """Rating is required — submitting without one returns 400"""
        response = post_review(client, sample_book_id, {'review_text': SAMPLE_REVIEW}, auth_token)
        assert response.status_code == 400
        assert 'rating' in response.get_json()['message'].lower()

    def test_review_text_required(self, client, mock_db, sample_book_id, auth_token):
        """Review text is required — submitting without it returns 400"""
        response = post_review(client, sample_book_id, {'rating': 5}, auth_token)
        assert response.status_code == 400
        msg = response.get_json()['message'].lower()
        assert 'review' in msg or 'empty' in msg

    def test_rating_below_1_rejected(self, client, mock_db, sample_book_id, auth_token):
        """Rating of 0 is below minimum and should return 400"""
        response = post_review(client, sample_book_id, {'rating': 0, 'review_text': SAMPLE_REVIEW}, auth_token)
        assert response.status_code == 400

    def test_rating_above_5_rejected(self, client, mock_db, sample_book_id, auth_token):
        """Rating of 6 exceeds maximum and should return 400"""
        response = post_review(client, sample_book_id, {'rating': 6, 'review_text': SAMPLE_REVIEW}, auth_token)
        assert response.status_code == 400

    def test_rating_must_be_integer(self, client, mock_db, sample_book_id, auth_token):
        """Decimal rating (3.5) is invalid and should return 400"""
        response = post_review(client, sample_book_id, {'rating': 3.5, 'review_text': SAMPLE_REVIEW}, auth_token)
        assert response.status_code == 400

    def test_whitespace_only_review_text_rejected(self, client, mock_db, sample_book_id, auth_token):
        """Whitespace-only review text is treated as empty and should return 400"""
        response = post_review(client, sample_book_id, {'rating': 5, 'review_text': '   '}, auth_token)
        assert response.status_code == 400


#  FUNCTIONAL TESTS: Review Submission 

class TestReviewSubmission:
    """Review submission and persistence"""

    def test_submit_valid_review(self, client, mock_db, sample_book_id, auth_token):
        """Valid review submission returns 201 with correct data"""
        response = post_review(client, sample_book_id, VALID_REVIEW, auth_token)
        assert response.status_code == 201
        data = response.get_json()
        assert data['success'] == True
        assert 'review_id' in data['data']
        assert data['data']['rating'] == 5
        assert data['data']['review_text'] == VALID_REVIEW['review_text']

    def test_review_saved_to_database(self, client, mock_db, sample_book_id, auth_token):
        """Submitted review is persisted correctly in MongoDB"""
        payload = {'rating': 4, 'review_text': 'Good book, enjoyed it.'}
        response = post_review(client, sample_book_id, payload, auth_token)
        assert response.status_code == 201

        review_id = response.get_json()['data']['review_id']
        review = mock_db.reviews.find_one({"_id": ObjectId(review_id)})

        assert review is not None
        assert review['rating'] == 4
        assert review['review_text'] == 'Good book, enjoyed it.'
        assert 'created_at' in review


#  INTEGRATION TESTS: Average Rating 

class TestAverageRatingCalculation:
    """Average rating recalculation on add and delete"""

    def test_average_rating_updates_after_review(self, client, mock_db, sample_book_id, auth_token):
        """Average rating and review count update correctly after a new review"""
        book_before = get_book(mock_db, sample_book_id)
        initial_count = book_before.get('review_count', 0)
        initial_rating = book_before.get('avg_rating', 0)

        response = post_review(client, sample_book_id, {'rating': 5, 'review_text': 'Excellent!'}, auth_token)
        assert response.status_code == 201

        data = response.get_json()['data']
        assert 'avg_rating' in data
        assert data['review_count'] == initial_count + 1
        assert data['avg_rating'] > initial_rating

    def test_multiple_reviews_calculate_correct_average(self, client, mock_db, sample_book_id, auth_token):
        """Two reviews with ratings 5 and 3 should produce an average of 4.0"""
        r1 = post_review(client, sample_book_id, {'rating': 5, 'review_text': 'Excellent!'}, auth_token)
        assert r1.status_code == 201

        r2 = post_review(client, sample_book_id, {'rating': 3, 'review_text': 'Average'}, auth_token)
        assert r2.status_code == 201
        assert r2.get_json()['data']['avg_rating'] == 4.0


#  EDGE CASE TESTS 

class TestEdgeCases:
    """Edge cases for review submission"""

    def test_book_not_found(self, client, mock_db, auth_token):
        """Submitting a review for a non-existent book returns 404"""
        response = post_review(client, str(ObjectId()), {'rating': 5, 'review_text': SAMPLE_REVIEW}, auth_token)
        assert response.status_code == 404
        assert 'not found' in response.get_json()['message'].lower()

    def test_multiple_reviews_from_same_user(self, client, mock_db, sample_book_id, auth_token):
        """Same user can submit multiple reviews and all are saved"""
        r1 = post_review(client, sample_book_id, {'rating': 5, 'review_text': 'Great first time!'}, auth_token)
        r2 = post_review(client, sample_book_id, {'rating': 4, 'review_text': 'Changed my mind!'}, auth_token)
        assert r1.status_code == 201
        assert r2.status_code == 201
        assert len(list(mock_db.reviews.find())) >= 2


#  AUTHENTICATION TESTS 

class TestAuthentication:

    def test_review_requires_jwt_token(self, client, mock_db, sample_book_id):
        """Request without Authorization header returns 401"""
        response = post_review(client, sample_book_id, {'rating': 5, 'review_text': SAMPLE_REVIEW}, headers={})
        assert response.status_code in [401, 422]

    def test_invalid_token_rejected(self, client, mock_db, sample_book_id):
        """Malformed token returns 401 or 422"""
        response = post_review(client, sample_book_id, {'rating': 5, 'review_text': SAMPLE_REVIEW},
                               headers={"Authorization": "Bearer invalid_token"})
        assert response.status_code in [401, 422]


#  SYSTEM TESTS 

class TestSystemIntegration:
    """End-to-end review flow"""

    def test_submit_review_response_has_all_fields(self, client, mock_db, sample_book_id, auth_token):
        """Submitted review response contains all required fields"""
        response = post_review(client, sample_book_id, {'rating': 5, 'review_text': 'Amazing book!'}, auth_token)
        assert response.status_code == 201
        data = response.get_json()['data']
        for field in ('review_id', 'rating', 'review_text', 'username', 'created_at', 'avg_rating', 'review_count'):
            assert field in data
        assert data['rating'] == 5
        assert data['review_text'] == 'Amazing book!'

    def test_book_rating_persists_across_reviews(self, client, mock_db, sample_book_id, auth_token):
        """Book avg_rating and review_count in DB stay in sync after each review"""
        r1 = post_review(client, sample_book_id, {'rating': 5, 'review_text': 'Perfect!'}, auth_token)
        assert r1.status_code == 201
        rating1 = r1.get_json()['data']['avg_rating']

        book = get_book(mock_db, sample_book_id)
        assert book['avg_rating'] == rating1
        assert book['review_count'] == 1

        r2 = post_review(client, sample_book_id, {'rating': 3, 'review_text': 'OK'}, auth_token)
        assert r2.status_code == 201
        rating2 = r2.get_json()['data']['avg_rating']

        book = get_book(mock_db, sample_book_id)
        assert book['avg_rating'] == rating2
        assert book['review_count'] == 2


if __name__ == '__main__':
    pytest.main([__file__, '-v'])