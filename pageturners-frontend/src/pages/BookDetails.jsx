// BookDetails.jsx
// UC4: View Book Details - displays full book info, synopsis, and reviews
// US.7: Add to Library functionality

import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getBookDetails, submitReview, deleteReview, addToLibrary } from '../api/books';
import '../styles/BookDetails.css';

const BookDetails = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [book, setBook] = useState(null);
    const [loading, setLoading] = useState(true);

    // star picker state for the write-a-review form
    const [selectedStars, setSelectedStars] = useState(0);
    const [hoverStars, setHoverStars] = useState(0);
    const [reviewText, setReviewText] = useState('');
    const [reviewError, setReviewError] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [submitSuccess, setSubmitSuccess] = useState('');
    const [deleteConfirm, setDeleteConfirm] = useState(null); // holds review_id to delete
    const [deleteError, setDeleteError] = useState('');
    const [currentUserId, setCurrentUserId] = useState('');

    // US.7: Add to Library state
    const [isInLibrary, setIsInLibrary] = useState(false);
    const [addingToLibrary, setAddingToLibrary] = useState(false);
    const [addLibraryError, setAddLibraryError] = useState('');

    useEffect(() => {
        const fetchDetails = async () => {
            const response = await getBookDetails(id);
            if (response.success) {
                setBook(response.data);
            }
            setLoading(false);
        };
        fetchDetails();
        // Get current user's username from localStorage
        const token = localStorage.getItem('token');
        if (token) {
            const payload = JSON.parse(atob(token.split('.')[1]));
            setCurrentUserId(payload.sub); // sub is the user_id
        }
    }, [id]);

    // render filled/empty stars for a given rating
    const renderStars = (rating) => {
        const filled = Math.round(rating || 0);
        return '★'.repeat(filled) + '☆'.repeat(5 - filled);
    };

    // Handle review submission (Connect to backend)
    const handleSubmitReview = async (e) => {
        e.preventDefault();

        // Clear previous messages
        setReviewError('');
        setSubmitSuccess('');

        // VALIDATION: Validate rating selected and review text)
        if (!selectedStars) {
            setReviewError('Please select a rating before submitting');
            return;
        }

        if (!reviewText.trim()) {
            setReviewError('Please write a review before submitting');
            return;
        }

        setSubmitting(true);

        // Call backend API
        const result = await submitReview(id, selectedStars, reviewText);

        if (result.success) {
            setSelectedStars(0);
            setReviewText('');
            setSubmitSuccess('Review submitted successfully!');

            // Add new review to the list + update rating
            const newReview = {
                review_id: result.data.review_id,
                user_id: currentUserId,
                username: result.data.username,
                rating: result.data.rating,
                review_text: result.data.reviewText || reviewText,
                created_at: result.data.created_at
            };

            setBook({
                ...book,
                avg_rating: result.data.avg_rating,
                review_count: result.data.review_count,
                reviews: [newReview, ...(book.reviews || [])]
            });

            setTimeout(() => setSubmitSuccess(''), 3000);
        }
        else {
            setReviewError(result.message);
        }

        setSubmitting(false);
    };

    // KLYRA-65: Handle confirm delete action
    const handleDeleteReview = async (reviewId) => {
        console.log('deleting review id:', reviewId);
        setDeleteError('');
        const result = await deleteReview(id, reviewId);
        console.log('delete result:', result);

        if (result.success) {
            // KLYRA-66: Remove deleted review from UI
            // KLYRA-67: Update average rating display
            setBook({
                ...book,
                avg_rating: result.data.new_avg_rating,
                review_count: result.data.review_count,
                reviews: book.reviews.filter(r => r.review_id !== reviewId)
            });
            setDeleteConfirm(null);
        } else {
            setDeleteError(result.message);
            setDeleteConfirm(null);
        }
    };

    // US.7: Handle adding book to library
    const handleAddToLibrary = async () => {
        setAddLibraryError('');
        setAddingToLibrary(true);

        const result = await addToLibrary(id);

        if (result.success) {
            setIsInLibrary(true);
        } else {
            setAddLibraryError(result.message);
        }

        setAddingToLibrary(false);
    };
    if (loading) return <div className="details-loading">Loading book details...</div>;
    if (!book) return <div className="details-error">Book not found.</div>;

    const genres = Array.isArray(book.genre) ? book.genre : [book.genre];

    return (
        <div className="book-details-page">

            {/* ── header - same as Dashboard ── */}
            <header className="dashboard-header">
                <div className="header-logo">
                    <span className="logo-icon">📚</span>
                    <span className="logo-text">PageTurners</span>
                </div>
                <nav className="header-nav">

                    <button className="nav-btn" onClick={() => navigate('/library')}>My Library</button>
                    <button className="nav-btn" onClick={() => navigate('/profile')}>Profile</button>
                    <button className="nav-btn logout-btn" onClick={() => {
                        localStorage.removeItem('token');
                        navigate('/login');
                    }}>
                        Logout
                    </button>
                </nav>
            </header>
            {/* breadcrumb */}
            <p className="book-breadcrumb">
                Browse › <span>{genres[0]}</span> › {book.title}
            </p>
            {/*warm beige strip with cover + info ── */}
            <div className="book-hero">
                <div className="book-hero-inner">

                    {/* LEFT: cover image */}
                    <div className="book-cover-col">
                        {book.cover_image ? (
                            <img
                                src={book.cover_image}
                                alt={book.title}
                                className="book-cover-large"
                            />
                        ) : (
                            <div className="cover-placeholder-large">📖</div>
                        )} </div>


                    {/* RIGHT: all text info */}
                    <div className="book-info-col">

                        {/* title + author */}
                        <h1 className="book-title-large">{book.title}</h1>
                        <p className="book-author-large">
                            <strong>{book.author_name}</strong>
                        </p>

                        {/* genre pills */}
                        <div className="genre-pills">
                            {genres.map(g => (
                                <span key={g} className="genre-pill">{g}</span>
                            ))}
                        </div>

                        {/* rating */}
                        <div className="rating-row">
                            <span className="stars-display">
                                {renderStars(book.avg_rating)}
                            </span>
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

                        {/* synopsis */}
                        <div className="synopsis-section">
                            <p className="synopsis-label"><strong>Synopsis</strong></p>
                            <p className="synopsis-text">
                                {book.synopsis || 'No synopsis available.'}
                            </p>
                        </div>
                        {/* US.7: ADD TO LIBRARY - Now placed specifically below the synopsis */}
                        <div className="action-section">
                            <button
                                className={`add-library-btn ${isInLibrary ? 'in-library' : ''}`}
                                onClick={handleAddToLibrary}
                                disabled={isInLibrary || addingToLibrary}
                            >
                                {isInLibrary ? '✓ In Your Library' : addingToLibrary ? 'Adding...' : '+ Add to Library'}
                            </button>
                            {addLibraryError && (
                                <p className="library-error">{addLibraryError}</p>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* ── reviews section ── */}
            <div className="reviews-wrapper">

                <div className="reviews-header">
                    <h2 className="reviews-title">Ratings & Reviews</h2>
                </div>

                {/* write a review */}
                <div className="write-review-card">
                    <h4>Write a Review</h4>

                    {/* Error message */}
                    {reviewError && (
                        <div style={{
                            backgroundColor: '#fde0e0',
                            color: '#d32f2f',
                            padding: '10px 12px',
                            borderRadius: '6px',
                            fontSize: '13px',
                            marginBottom: '1rem'
                        }}>
                            {reviewError}
                        </div>
                    )}

                    {/* Success message */}
                    {submitSuccess && (
                        <div style={{
                            backgroundColor: '#e0f2e0',
                            color: '#2e7d32',
                            padding: '10px 12px',
                            borderRadius: '6px',
                            fontSize: '13px',
                            marginBottom: '1rem'
                        }}>
                            {submitSuccess}
                        </div>
                    )}

                    {/* interactive star picker */}
                    <div className="star-picker">
                        {[1, 2, 3, 4, 5].map(star => (
                            <button
                                key={star}
                                className={`star-btn ${star <= (hoverStars || selectedStars) ? 'active' : ''}`}
                                onMouseEnter={() => setHoverStars(star)}
                                onMouseLeave={() => setHoverStars(0)}
                                onClick={() => setSelectedStars(star)}
                                aria-label={`Rate ${star} star${star > 1 ? 's' : ''}`}
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
                    <button
                        className="submit-review-btn"
                        onClick={handleSubmitReview}
                        disabled={submitting}
                    >
                        {submitting ? 'Submitting...' : 'Submit Review'}
                    </button>
                </div>

                {/* KLYRA-77, 78, 79: Delete confirmation dialog */}
                {deleteConfirm && (
                    <div style={{
                        position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
                        backgroundColor: 'rgba(0,0,0,0.4)', display: 'flex',
                        alignItems: 'center', justifyContent: 'center', zIndex: 1000
                    }}>
                        <div style={{
                            background: 'white', borderRadius: '10px', padding: '2rem',
                            maxWidth: '400px', width: '90%', textAlign: 'center'
                        }}>
                            <h3 style={{ marginBottom: '1rem', color: '#333' }}>Delete Review</h3>
                            <p style={{ color: '#666', marginBottom: '1.5rem' }}>
                                Are you sure you want to delete this review? This cannot be undone.
                            </p>
                            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
                                {/* KLYRA-64: Cancel keeps review visible */}
                                <button
                                    onClick={() => setDeleteConfirm(null)}
                                    style={{
                                        padding: '10px 24px', borderRadius: '6px',
                                        border: '1px solid #ccc', background: 'white',
                                        cursor: 'pointer', fontSize: '14px'
                                    }}
                                >
                                    Cancel
                                </button>
                                {/* KLYRA-65: Confirm triggers delete */}
                                <button
                                    onClick={() => handleDeleteReview(deleteConfirm)}
                                    style={{
                                        padding: '10px 24px', borderRadius: '6px',
                                        border: 'none', background: '#c0392b',
                                        color: 'white', cursor: 'pointer', fontSize: '14px'
                                    }}
                                >
                                    Delete
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {deleteError && (
                    <div style={{
                        backgroundColor: '#fde0e0', color: '#d32f2f',
                        padding: '10px 12px', borderRadius: '6px',
                        fontSize: '13px', marginBottom: '1rem'
                    }}>
                        {deleteError}
                    </div>
                )}

                {/* existing reviews list */}
                {book.reviews && book.reviews.length > 0 ? (
                    book.reviews.map((review, i) => (
                        <div key={i} className="review-card">
                            <div className="review-top">
                                <span className="reviewer-name">{review.username || 'Anonymous'}</span>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                    <span className="review-stars">
                                        {'★'.repeat(review.rating)}{'☆'.repeat(5 - review.rating)}
                                    </span>
                                    {/* KLYRA-62: Delete button only on logged-in user's own review */}
                                    {review.user_id === currentUserId && (
                                        <button
                                            onClick={() => setDeleteConfirm(review.review_id)}
                                            style={{
                                                background: 'none', border: 'none',
                                                color: '#c0392b', cursor: 'pointer',
                                                fontSize: '13px', fontWeight: '600'
                                            }}
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
                            <p className="review-text">{review.review_text}</p>
                        </div>
                    ))
                ) : (
                    <div className="no-reviews">
                        No reviews yet — be the first to share your thoughts!
                    </div>
                )}
                {/* back button */}
                <div style={{ width: '100%', gridColumn: '1/-1' }}>
                    <button className="back-btn" onClick={() => navigate(-1)}>
                        <span className="back-arrow">←</span> Back to results
                    </button>
                </div>
            </div>
        </div>
    );
};





export default BookDetails;