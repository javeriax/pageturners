// Library.jsx
// US.7: User's personal library - shows all books user has added
// Displays books organized by status (Currently Reading, Want to Read, Completed, Dropped)

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getLibrary, removeFromLibrary, updateLibraryStatus } from '../api/books';
import '../styles/Dashboard.css';
import '../styles/ProgressTracker.css';
import BookCard from '../components/BookCard';
import ReadingProgress from './ProgressTracker';

export default function Library() {
    const navigate = useNavigate();

    // All library books (no pagination - load all at once)
    const [allBooks, setAllBooks] = useState([]);

    // Loading and error states
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    // UI state
    const [removeConfirm, setRemoveConfirm] = useState(null); // book_id to remove
    const [removeError, setRemoveError] = useState('');

    // Redirect to login if no token found
    useEffect(() => {
        const token = localStorage.getItem('token');
        if (!token) navigate('/login');
    }, [navigate]);

    // Load library on mount
    useEffect(() => {
        loadLibrary();
    }, []);

    // Fetch all library books from backend (no pagination)
    const loadLibrary = async () => {
        setLoading(true);
        setError('');

        // Fetch all books without pagination filter
        const result = await getLibrary(1, 1000, '');

        if (result.success) {
            setAllBooks(result.data);
        } else {
            setError(result.message || 'Failed to load library');
            setAllBooks([]);
        }

        setLoading(false);
    };

    // Handle removing book from library
    const handleRemoveBook = async (bookId) => {
        setRemoveError('');
        const result = await removeFromLibrary(bookId);

        if (result.success) {
            // Remove from UI
            setAllBooks(allBooks.filter(book => book._id !== bookId));
            setRemoveConfirm(null);
        } else {
            setRemoveError(result.message);
            setRemoveConfirm(null);
        }
    };

    // Handle updating reading status
    const handleUpdateStatus = async (bookId, newStatus) => { // e.x: "currently reading", "completed", etc.
    const result = await updateLibraryStatus(bookId, newStatus); // API call to update status in backend
    // If successful, update status in UI
    if (result.success) {
        setAllBooks(allBooks.map(book => {
            if (book._id !== bookId) return book; // no change for other books
            return {
                ...book,
                status: newStatus,
                current_page: newStatus === 'currently reading' // if moving to currently reading, keep current page
                    ? book.current_page // keep if still reading
                    : 0                 // reset otherwise
            };
        }));
    }
};

    // Organize books by status
    const booksByStatus = {
        'currently reading': allBooks.filter(b => b.status === 'currently reading'),
        'want to read': allBooks.filter(b => b.status === 'want to read'),
        'completed': allBooks.filter(b => b.status === 'completed'),
        'dropped': allBooks.filter(b => b.status === 'dropped')
    };

    // Calculate totals
    const totals = {
        total: allBooks.length,
        currentlyReading: booksByStatus['currently reading'].length,
        completed: booksByStatus['completed'].length,
        wantToRead: booksByStatus['want to read'].length
    };

    // Component to render a status section
    const StatusSection = ({ title, books, status }) => {
        if (books.length === 0) {
            return (
                <div className="library-status-section">
                    <h2>{title}:</h2>
                    <div className="empty-status">No {title.toLowerCase()} yet</div>
                </div>
            );
        }

        return (
            <div className="library-status-section">
                <h2>{title}:</h2>
                <div className="library-books-grid">
                    {books.map(book => (
                        <div key={book._id} className="library-book-card">
                            <BookCard book={book} />
                                    {book.status === 'currently reading' && (
                            <ReadingProgress 
                                    book={book} 
                                    onUpdate={(bookId, newPage) => {
                                        setAllBooks(allBooks.map(b =>
                                            b._id === bookId ? { ...b, current_page: newPage } : b
                                        ));
                                    }}
                                />
                            )}
                              <div className="library-book-footer">
                                <select
                                    className="status-select"
                                    value={book.status}
                                    onChange={(e) => handleUpdateStatus(book._id, e.target.value)}
                                >
                                    <option value="want to read">Want to read</option>
                                    <option value="currently reading">Currently reading</option>
                                    <option value="completed">Completed</option>
                                    <option value="dropped">Dropped</option>
                                </select>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    };

    if (loading) return <div className="details-loading">Loading your library...</div>;

    return (
        <div className="book-details-page">
            {/* ── header ── */}
            <header className="dashboard-header">
                <div className="header-logo">
                    <span className="logo-icon">📚</span>
                    <span className="logo-text">PageTurners</span>
                </div>
                <nav className="header-nav">
                    <button className="nav-btn" onClick={() => navigate('/dashboard')}>
                        Dashboard
                    </button>
                    <button className="nav-btn active" onClick={() => navigate('/library')}>
                        My Library
                    </button>
                    <button className="nav-btn" onClick={() => navigate('/profile')}>Profile</button>
                    <button className="nav-btn logout-btn" onClick={() => {
                        localStorage.removeItem('token');
                        navigate('/login');
                    }}>
                        Logout
                    </button>
                </nav>
            </header>

            {/* ── main content ── */}
            <div className="library-container">
                <div className="library-header">
                    <h1>My Library</h1>
                    <p className="library-subtitle">All your books in one place</p>
                </div>

                {/* ── error message ── */}
                {error && <div className="error-message">{error}</div>}
                {removeError && <div className="error-message">{removeError}</div>}

                {/* ── empty state ── */}
                {totals.total === 0 && (
                    <div className="empty-library">
                        <div className="empty-icon">📖</div>
                        <h2>Your library is empty</h2>
                        <p>Start adding books to build your personal library!</p>
                        <button
                            className="nav-btn"
                            onClick={() => navigate('/dashboard')}
                        >
                            Browse Books
                        </button>
                    </div>
                )}

                {/* ── stats section ── */}
                {totals.total > 0 && (
                    <div className="library-stats">
                        <div className="stat-box">
                            <div className="stat-label">TOTAL BOOKS</div>
                            <div className="stat-value">{totals.total}</div>
                        </div>
                        <div className="stat-box">
                            <div className="stat-label">CURRENTLY READING</div>
                            <div className="stat-value">{totals.currentlyReading}</div>
                        </div>
                        <div className="stat-box">
                            <div className="stat-label">COMPLETED</div>
                            <div className="stat-value">{totals.completed}</div>
                        </div>
                        <div className="stat-box">
                            <div className="stat-label">WANT TO READ</div>
                            <div className="stat-value">{totals.wantToRead}</div>
                        </div>
                    </div>
                )}

                {/* ── books organized by status ── */}
                {totals.total > 0 && (
                    <div className="library-sections">
                        <StatusSection
                            title="Currently Reading"
                            books={booksByStatus['currently reading']}
                            status="currently reading"
                        />
                        <StatusSection
                            title="Want to Read"
                            books={booksByStatus['want to read']}
                            status="want to read"
                        />
                        <StatusSection
                            title="Completed"
                            books={booksByStatus['completed']}
                            status="completed"
                        />
                        <StatusSection
                            title="Dropped"
                            books={booksByStatus['dropped']}
                            status="dropped"
                        />
                    </div>
                )}
            </div>
        </div>
    );
}
