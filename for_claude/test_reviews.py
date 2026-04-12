import pytest
import mongomock
from app import app
from datetime import datetime
from bson import ObjectId

@pytest.fixture
def client():
    """Configures the app for testing and provides a test client."""
    app.config['TESTING'] = True
    with app.test_client() as client:
        yield client

@pytest.fixture(autouse=True)
def mock_db(monkeypatch):
    """Replaces the real database with a mock one for every test."""
    mock_client = mongomock.MongoClient()
    mock_database = mock_client["pageturners_test"]
    # Force the app to use the mock database to avoid touching real data
    monkeypatch.setattr("app.db", mock_database)
    return mock_database

@pytest.fixture
def sample_book_id(mock_db):
    """Insert a test book into mock database and return its ID"""
    result = mock_db.books.insert_one({
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
    })
    return str(result.inserted_id)

# @pytest.fixture
# def auth_token(mock_db):
#     """Create a test user and return a JWT token"""
#     import bcrypt
#     from flask_jwt_extended import create_access_token
    
#     # Insert a test user
#     hashed_password = bcrypt.hashpw("TestPassword123".encode('utf-8'), bcrypt.gensalt())
#     user = mock_db.users.insert_one({
#         "username": "testuser",
#         "email": "test@example.com",
#         "password": hashed_password,
#         "is_verified": True
#     })
    
#     # Create a JWT token for this user
#     token = create_access_token(identity=str(user.inserted_id))
#     return token
# tests/test_reviews.py

@pytest.fixture
def auth_token(mock_db):
    """Create a test user and return a JWT token"""
    import bcrypt
    from flask_jwt_extended import create_access_token
    from app import app  # Import your Flask app

    # Insert a test user
    hashed_password = bcrypt.hashpw("TestPassword123".encode('utf-8'), bcrypt.gensalt())
    user = mock_db.users.insert_one({
        "username": "testuser",
        "email": "test@example.com",
        "password": hashed_password,
        "is_verified": True
    })

    # Use the app context to create the JWT token
    with app.app_context():  # Make sure to push the app context here
        token = create_access_token(identity=str(user.inserted_id))
    
    return token
# ─── UNIT TESTS: Validation ───

class TestReviewValidation:
    """Test KLYRA-69 & KLYRA-87: Validation"""
    
    def test_rating_required(self, client, mock_db, sample_book_id, auth_token):
        """Test that rating is required (KLYRA-87)"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        
        response = client.post(
            f'/api/books/{sample_book_id}/reviews',
            json={
                'review_text': 'Great book!'
                # Missing rating
            },
            headers=headers
        )
        
        assert response.status_code == 400
        assert 'rating' in response.get_json()['message'].lower()
    
    def test_review_text_required(self, client, mock_db, sample_book_id, auth_token):
        """Test that review text is required (KLYRA-87)"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        
        response = client.post(
            f'/api/books/{sample_book_id}/reviews',
            json={
                'rating': 5
                # Missing review_text
            },
            headers=headers
        )
        
        assert response.status_code == 400
        assert 'review' in response.get_json()['message'].lower() or 'empty' in response.get_json()['message'].lower()
    
    def test_rating_must_be_1_to_5(self, client, mock_db, sample_book_id, auth_token):
        """Test that rating must be between 1 and 5 (KLYRA-87)"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        
        # Test rating < 1
        response = client.post(
            f'/api/books/{sample_book_id}/reviews',
            json={
                'rating': 0,
                'review_text': 'Great book!'
            },
            headers=headers
        )
        assert response.status_code == 400
        
        # Test rating > 5
        response = client.post(
            f'/api/books/{sample_book_id}/reviews',
            json={
                'rating': 6,
                'review_text': 'Great book!'
            },
            headers=headers
        )
        assert response.status_code == 400
    
    def test_rating_must_be_integer(self, client, mock_db, sample_book_id, auth_token):
        """Test that rating must be an integer (KLYRA-87)"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        
        response = client.post(
            f'/api/books/{sample_book_id}/reviews',
            json={
                'rating': 3.5,  # Should be integer
                'review_text': 'Great book!'
            },
            headers=headers
        )
        
        assert response.status_code == 400
    
    def test_empty_review_text(self, client, mock_db, sample_book_id, auth_token):
        """Test submitting with empty review text (KLYRA-120)"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        
        response = client.post(
            f'/api/books/{sample_book_id}/reviews',
            json={
                'rating': 5,
                'review_text': '   '  # Only spaces
            },
            headers=headers
        )
        
        # Should be rejected
        assert response.status_code == 400


# ─── FUNCTIONAL TESTS: Review Submission ───

class TestReviewSubmission:
    """Test KLYRA-82, KLYRA-83: Review submission and database saving"""
    
    def test_submit_valid_review(self, client, mock_db, sample_book_id, auth_token):
        """Test submitting a valid review (KLYRA-82, KLYRA-83)"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        
        response = client.post(
            f'/api/books/{sample_book_id}/reviews',
            json={
                'rating': 5,
                'review_text': 'This is an amazing book! Highly recommend.'
            },
            headers=headers
        )
        
        # Should return 201 Created
        assert response.status_code == 201
        data = response.get_json()
        assert data['success'] == True
        assert 'review_id' in data['data']
        assert data['data']['rating'] == 5
        assert data['data']['review_text'] == 'This is an amazing book! Highly recommend.'
    
    def test_review_saved_to_database(self, client, mock_db, sample_book_id, auth_token):
        """Test that review is actually saved in MongoDB (KLYRA-83)"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        
        # Submit a review
        response = client.post(
            f'/api/books/{sample_book_id}/reviews',
            json={
                'rating': 4,
                'review_text': 'Good book, enjoyed it.'
            },
            headers=headers
        )
        
        assert response.status_code == 201
        review_id = response.get_json()['data']['review_id']
        
        # Verify it was saved in database
        review = mock_db.reviews.find_one({"_id": ObjectId(review_id)})
        
        assert review is not None
        assert review['rating'] == 4
        assert review['review_text'] == 'Good book, enjoyed it.'
        assert 'created_at' in review


# ─── INTEGRATION TESTS: Average Rating ───

class TestAverageRatingCalculation:
    """Test KLYRA-117: Average rating calculation"""
    
    def test_average_rating_updates_after_review(self, client, mock_db, sample_book_id, auth_token):
        """Test that book's average rating updates after review submission (KLYRA-117)"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        
        # Get initial rating
        book_before = mock_db.books.find_one({"_id": ObjectId(sample_book_id)})
        initial_rating = book_before.get('avg_rating', 0)
        initial_count = book_before.get('review_count', 0)
        
        # Submit a 5-star review
        response = client.post(
            f'/api/books/{sample_book_id}/reviews',
            json={
                'rating': 5,
                'review_text': 'Excellent!'
            },
            headers=headers
        )
        
        assert response.status_code == 201
        data = response.get_json()['data']
        
        # Check that average rating was updated
        assert 'avg_rating' in data
        assert data['review_count'] == initial_count + 1
        assert data['avg_rating'] > initial_rating
    
    def test_multiple_reviews_calculate_average(self, client, mock_db, sample_book_id, auth_token):
        """Test that multiple reviews calculate average correctly (KLYRA-117)"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        
        # Submit first 5-star review
        response1 = client.post(
            f'/api/books/{sample_book_id}/reviews',
            json={'rating': 5, 'review_text': 'Excellent!'},
            headers=headers
        )
        assert response1.status_code == 201
        avg1 = response1.get_json()['data']['avg_rating']
        
        # Submit second 3-star review
        response2 = client.post(
            f'/api/books/{sample_book_id}/reviews',
            json={'rating': 3, 'review_text': 'Average'},
            headers=headers
        )
        assert response2.status_code == 201
        avg2 = response2.get_json()['data']['avg_rating']
        
        # Average should be (5 + 3) / 2 = 4
        assert avg2 == 4.0


# ─── EDGE CASE TESTS ───

class TestEdgeCases:
    """Test KLYRA-120: Edge cases"""
    
    def test_book_not_found(self, client, mock_db, auth_token):
        """Test submitting review for non-existent book"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        fake_book_id = str(ObjectId())
        
        response = client.post(
            f'/api/books/{fake_book_id}/reviews',
            json={
                'rating': 5,
                'review_text': 'Great book!'
            },
            headers=headers
        )
        
        assert response.status_code == 404
        assert 'not found' in response.get_json()['message'].lower()
    
    def test_multiple_reviews_from_same_user(self, client, mock_db, sample_book_id, auth_token):
        """Test that same user can submit multiple reviews for same book (KLYRA-120)"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        
        # First review
        response1 = client.post(
            f'/api/books/{sample_book_id}/reviews',
            json={
                'rating': 5,
                'review_text': 'Great first time!'
            },
            headers=headers
        )
        assert response1.status_code == 201
        
        # Second review from same user
        response2 = client.post(
            f'/api/books/{sample_book_id}/reviews',
            json={
                'rating': 4,
                'review_text': 'Changed my mind, pretty good!'
            },
            headers=headers
        )
        assert response2.status_code == 201
        
        # Both should be saved
        reviews = list(mock_db.reviews.find())
        assert len(reviews) >= 2


# ─── AUTHENTICATION TESTS ───

class TestAuthentication:
    """Test KLYRA-87: JWT authentication check"""
    
    def test_review_requires_jwt_token(self, client, mock_db, sample_book_id):
        """Test that review submission requires valid JWT token (KLYRA-87)"""
        
        response = client.post(
            f'/api/books/{sample_book_id}/reviews',
            json={
                'rating': 5,
                'review_text': 'Great book!'
            }
            # No Authorization header
        )
        
        assert response.status_code == 401
    
    def test_invalid_token_rejected(self, client, mock_db, sample_book_id):
        """Test that invalid token is rejected"""
        headers = {"Authorization": "Bearer invalid_token"}
        
        response = client.post(
            f'/api/books/{sample_book_id}/reviews',
            json={
                'rating': 5,
                'review_text': 'Great book!'
            },
            headers=headers
        )
        
        assert response.status_code == 401


# ─── SYSTEM TESTS ───

class TestSystemIntegration:
    """Test KLYRA-118, KLYRA-120: Full system integration"""
    
    def test_submit_review_displays_correctly(self, client, mock_db, sample_book_id, auth_token):
        """Test that submitted review appears correctly (KLYRA-118, KLYRA-120)"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        
        # Submit review
        response = client.post(
            f'/api/books/{sample_book_id}/reviews',
            json={
                'rating': 5,
                'review_text': 'Amazing book!'
            },
            headers=headers
        )
        
        assert response.status_code == 201
        data = response.get_json()['data']
        
        # Verify all fields are returned
        assert 'review_id' in data
        assert 'rating' in data and data['rating'] == 5
        assert 'review_text' in data and data['review_text'] == 'Amazing book!'
        assert 'username' in data
        assert 'created_at' in data
        assert 'avg_rating' in data
        assert 'review_count' in data
    
    def test_book_rating_persists_across_reviews(self, client, mock_db, sample_book_id, auth_token):
        """Test that book rating persists correctly across multiple reviews"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        
        # Submit first review (5 stars)
        response1 = client.post(
            f'/api/books/{sample_book_id}/reviews',
            json={'rating': 5, 'review_text': 'Perfect!'},
            headers=headers
        )
        assert response1.status_code == 201
        rating1 = response1.get_json()['data']['avg_rating']
        
        # Check book in database
        book = mock_db.books.find_one({"_id": ObjectId(sample_book_id)})
        assert book['avg_rating'] == rating1
        assert book['review_count'] == 1
        
        # Submit second review (3 stars)
        response2 = client.post(
            f'/api/books/{sample_book_id}/reviews',
            json={'rating': 3, 'review_text': 'OK'},
            headers=headers
        )
        assert response2.status_code == 201
        rating2 = response2.get_json()['data']['avg_rating']
        
        # Check book updated in database
        book = mock_db.books.find_one({"_id": ObjectId(sample_book_id)})
        assert book['avg_rating'] == rating2
        assert book['review_count'] == 2


if __name__ == '__main__':
    pytest.main([__file__, '-v'])