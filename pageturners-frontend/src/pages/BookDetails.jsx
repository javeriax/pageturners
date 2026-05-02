import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getBookDetails, submitReview, deleteReview, addToLibrary } from '../api/books';
import '../styles/BookDetails.css';

// book details page component:
// shows book info, reviews, and allows adding to library and submitting reviews
const BookDetails = () => {
    // get book ID from URL params and set up navigation:
    const { id } = useParams();
    const navigate = useNavigate();
    const [book, setBook] = useState(null);
    const [loading, setLoading] = useState(true);
    const [currentUserId, setCurrentUserId] = useState('');

    // review form state:
    const [selectedStars, setSelectedStars] = useState(0);
    const [hoverStars, setHoverStars] = useState(0);
    const [reviewText, setReviewText] = useState('');
    const [reviewError, setReviewError] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [submitSuccess, setSubmitSuccess] = useState('');
    
    // interaction state for delete confirmation, review expansion, and library status:
    const [deleteConfirm, setDeleteConfirm] = useState(null);
    const [deleteError, setDeleteError] = useState('');
    const [expandedReviewId, setExpandedReviewId] = useState(null);
    const [isInLibrary, setIsInLibrary] = useState(false);
    const [addingToLibrary, setAddingToLibrary] = useState(false);
    const [addLibraryError, setAddLibraryError] = useState('');

    // fetch book detail:
    useEffect(() => {
        const fetchDetails = async () => {
            const response = await getBookDetails(id);
            if (response.success) setBook(response.data);
            setLoading(false);
        };
    
        // extract user ID from token to identify user's reviews and library status:
        const token = localStorage.getItem('token');
        if (token) {
            try {
                const payload = JSON.parse(atob(token.split('.')[1]));
                setCurrentUserId(payload.sub);
            } catch (e) {
                console.error("failed to parse token", e);
            }
        }
        fetchDetails();
    }, [id]);

    // helper to render star strings:
    const renderStars = (rating) => {
        const filled = Math.round(rating || 0);
        return '★'.repeat(filled) + '☆'.repeat(5 - filled);
    };

    // helper to handle text truncation:
    const getTruncatedContent = (text, limit = 200) => {
        if (!text) return { display: '', isLong: false };
        if (text.length <= limit) return { display: text, isLong: false };
        return { display: text.substring(0, limit) + '...', isLong: true };
    };

    // handle logout:
    const handleLogout = () => {
        localStorage.removeItem('token');
        navigate('/login');
    };

    // handle review submission:
    const onSubmitReview = async (e) => {
        e.preventDefault();
        setReviewError('');
        setSubmitSuccess('');
        setSubmitting(true);

        const result = await submitReview(id, selectedStars, reviewText);

        if (result.success) {
            setSelectedStars(0);
            setReviewText('');
            setSubmitSuccess('Review submitted successfully!');

            const newReview = {
                review_id: result.data.review_id,
                user_id: currentUserId,
                username: result.data.username,
                rating: result.data.rating,
                review_text: result.data.reviewText || reviewText,
                created_at: result.data.created_at
            };

            setBook(prev => ({
                ...prev,
                avg_rating: result.data.avg_rating,
                review_count: result.data.review_count,
                reviews: [newReview, ...(prev.reviews || [])]
            }));

            setTimeout(() => setSubmitSuccess(''), 3000);
        } else {
            setReviewError(result.message);
        }
        setSubmitting(false);
    };

    // handle review deletion:
    const onConfirmDelete = async (reviewId) => {
        setDeleteError('');
        const result = await deleteReview(id, reviewId);

        if (result.success) {
            setBook(prev => ({
                ...prev,
                avg_rating: result.data.new_avg_rating,
                review_count: result.data.review_count,
                reviews: prev.reviews.filter(r => r.review_id !== reviewId)
            }));
            setDeleteConfirm(null);
        } else {
            setDeleteError(result.message);
            setDeleteConfirm(null);
        }
    };

    // handle adding book to library:
    const onAddToLibrary = async () => {
        setAddLibraryError('');
        setAddingToLibrary(true);
        const result = await addToLibrary(id);
        if (result.success) setIsInLibrary(true);
        else setAddLibraryError(result.message);
        setAddingToLibrary(false);
    };

    if (loading) return <div className="details-loading">Loading book details...</div>;
    if (!book) return <div className="details-error">Book not found.</div>;

    // ensure genre is always an array for consistenncy in rendering:
    const genres = Array.isArray(book.genre) ? book.genre : [book.genre];

    // main render:
    return (
        <div className="book-details-page">
            <header className="dashboard-header">
                <div className="header-logo">
                    <span className="logo-icon">⚔️</span>
                    <span className="logo-text">PageTurners</span>
                </div>
                <nav className="header-nav">
                    <button className="nav-btn" onClick={() => navigate('/library')}>My Library</button>
                    <button className="nav-btn" onClick={() => navigate('/profile')}>Profile</button>
                    <button className="nav-btn logout-btn" onClick={handleLogout}>Logout</button>
                </nav>
            </header>

            <p className="book-breadcrumb">
                Browse › <span>{genres[0]}</span> › {book.title}
            </p>
            
            <button className="back-btn" onClick={() => navigate('/dashboard')}>
                ← Back to Dashboard
            </button>

            <section className="book-hero">
                <div className="book-hero-inner">
                    <div className="book-cover-col">
                        {book.cover_image ? (
                            <img src={book.cover_image} alt={book.title} className="book-cover-large" />
                        ) : (
                            <div className="cover-placeholder-large">📖</div>
                        )}
                    </div>

                    <div className="book-info-col">
                        <h1 className="book-title-large">{book.title}</h1>
                        <p className="book-author-large"><strong>{book.author_name}</strong></p>

                        <div className="genre-pills">
                            {genres.map(g => <span key={g} className="genre-pill">{g}</span>)}
                        </div>

                        <div className="rating-row">
                            <span className="stars-display">{renderStars(book.avg_rating)}</span>
                            <span className="rating-number">
                                {book.avg_rating ? Number(book.avg_rating).toFixed(1) : '—'}
                            </span>
                            <span className="rating-count">
                                {book.review_count ? `${book.review_count} reviews` : 'No reviews yet'}
                            </span>
                        </div>

                        <div className="book-meta-strip">
                            {book.total_pages > 0 && (
                                <div className="meta-item">
                                    <span className="meta-label">Total Pages</span>
                                    <span className="meta-value">{book.total_pages}</span>
                                </div>
                            )}
                            {book.release_date && (
                                <div className="meta-item">
                                    <span className="meta-label">Released</span>
                                    <span className="meta-value">{book.release_date}</span>
                                </div>
                            )}
                        </div>

                        <div className="synopsis-section">
                            <p className="synopsis-label"><strong>Synopsis</strong></p>
                            <p className="synopsis-text">{book.synopsis || 'No synopsis available.'}</p>
                        </div>

                        <div className="action-section">
                            <button
                                className={`add-library-btn ${isInLibrary ? 'in-library' : ''}`}
                                onClick={onAddToLibrary}
                                disabled={isInLibrary || addingToLibrary}
                            >
                                {isInLibrary ? '✓ In Your Library' : addingToLibrary ? 'Adding...' : '+ Add to Library'}
                            </button>
                            {addLibraryError && <p className="library-error">{addLibraryError}</p>}
                        </div>
                    </div>
                </div>
            </section>

            <section className="reviews-wrapper">
                <div className="reviews-header">
                    <h2 className="reviews-title">Ratings & Reviews</h2>
                </div>

                <div className="write-review-card">
                    <h4>Write a Review</h4>
                    {reviewError && <div className="error-banner">{reviewError}</div>}
                    {submitSuccess && <div className="success-banner">{submitSuccess}</div>}

                    <div className="star-picker">
                        {[1, 2, 3, 4, 5].map(star => (
                            <button
                                key={star}
                                className={`star-btn ${star <= (hoverStars || selectedStars) ? 'active' : ''}`}
                                onMouseEnter={() => setHoverStars(star)}
                                onMouseLeave={() => setHoverStars(0)}
                                onClick={() => setSelectedStars(star)}
                            >
                                ★
                            </button>
                        ))}
                    </div>

                    <textarea
                        className="review-textarea"
                        placeholder="What did you think of this book?"
                        value={reviewText}
                        onChange={e => setReviewText(e.target.value)}
                    />
                    <button className="submit-review-btn" onClick={onSubmitReview} disabled={submitting}>
                        {submitting ? 'Submitting...' : 'Submit Review'}
                    </button>
                </div>

                {deleteConfirm && (
                    <div className="modal-overlay">
                        <div className="modal-content">
                            <h3>Delete Review</h3>
                            <p>Are you sure you want to delete this review? This cannot be undone.</p>
                            <div className="modal-actions">
                                <button onClick={() => setDeleteConfirm(null)} className="cancel-btn">Cancel</button>
                                <button onClick={() => onConfirmDelete(deleteConfirm)} className="confirm-delete-btn">Delete</button>
                            </div>
                        </div>
                    </div>
                )}

                {deleteError && <div className="error-banner">{deleteError}</div>}

                {book.reviews?.length > 0 ? (
                    book.reviews.map((review, i) => {
                        const reviewId = review.review_id || `idx-${i}`;
                        const isExpanded = expandedReviewId === reviewId;
                        const { display, isLong } = getTruncatedContent(review.review_text);

                        return (
                            <div key={reviewId} className="review-card">
                                <div className="review-top">
                                    <span className="reviewer-name">{review.username || 'Anonymous'}</span>
                                    <div className="review-meta-right">
                                        <span className="review-stars">{renderStars(review.rating)}</span>
                                        {review.user_id === currentUserId && (
                                            <button 
                                                className="delete-link-btn" 
                                                onClick={() => setDeleteConfirm(reviewId)}
                                            >
                                                Delete
                                            </button>
                                        )}
                                    </div>
                                </div>
                                {review.created_at && (
                                    <p className="review-date">
                                        {new Date(review.created_at).toLocaleDateString('en-US', {
                                            year: 'numeric', month: 'long', day: 'numeric'
                                        })}
                                    </p>
                                )}
                                <p className="review-text">
                                    {isExpanded ? review.review_text : display}
                                </p>
                                {isLong && (
                                    <button 
                                        className="show-more-btn" 
                                        onClick={() => setExpandedReviewId(isExpanded ? null : reviewId)}
                                    >
                                        {isExpanded ? 'Show less' : 'Show more'}
                                    </button>
                                )}
                            </div>
                        );
                    })
                ) : (
                    <div className="no-reviews">No reviews yet — be the first to share your thoughts!</div>
                )}
            </section>
        </div>
    );
};

export default BookDetails;