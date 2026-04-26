// api/books.js
// all api calls related to book details, reviews, and library management
// used by BookDetails.jsx and Library.jsx

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';

// helper to get jwt token from localstorage
const getToken = () => localStorage.getItem('token');

// helper to build authorization header
const authHeader = () => ({
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${getToken()}`
});


/**
 * fetch full details for a single book including reviews - UC4
 * @param {string} bookId - mongodb objectid of the book
 * @returns {object} { success, data: { book fields + reviews array } }
 */
export const getBookDetails = async (bookId) => {
    try {
        const response = await fetch(`${API_BASE}/books/${bookId}`, {
            method: 'GET',
            headers: authHeader()
        });

        const data = await response.json();
        return data;

    } catch (error) {
        console.error('get book details error:', error);
        return {
            success: false,
            message: 'Failed to connect to server',
            data: null
        };
    }
};

// submitReview: Send user's rating and review to backend
export const submitReview = async (bookId, rating, reviewText) => {
    try {
        const token = localStorage.getItem('token');

        if (!token) {
            return {
                success: false,
                message: 'You must be logged in to submit a review'
            };
        }

        const response = await fetch(`${API_BASE}/books/${bookId}/reviews`, {  // Use API_BASE here
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}` // Send JWT token for authentication
            },
            body: JSON.stringify({
                rating,
                review_text: reviewText
            })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || 'Failed to submit review');
        }

        return {
            success: true,
            message: data.message,
            data: data.data
        };
    } catch (error) {
        return {
            success: false,
            message: error.message || 'An error occurred while submitting your review'
        };
    }
};

// getBookReviews: Fetch all reviews for a book
export const getBookReviews = async (bookId) => {
    try {
        const token = localStorage.getItem('token');

        const response = await fetch(`${API_BASE}/books/${bookId}/reviews`, {  // Use API_BASE here
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || 'Failed to fetch reviews');
        }

        return {
            success: true,
            data: data.data
        };
    } catch (error) {
        return {
            success: false,
            message: error.message || 'An error occurred while fetching reviews'
        };
    }
};


// deleteReview: Delete the logged-in user's own review
// KLYRA-65, KLYRA-66, KLYRA-67
export const deleteReview = async (bookId, reviewId) => {
    try {
        const token = localStorage.getItem('token');

        if (!token) {
            return {
                success: false,
                message: 'You must be logged in to delete a review'
            };
        }

        const response = await fetch(`${API_BASE}/books/${bookId}/reviews/${reviewId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || 'Failed to delete review');
        }

        return {
            success: true,
            message: data.message,
            data: data.data
        };

    } catch (error) {
        return {
            success: false,
            message: error.message || 'An error occurred while deleting your review'
        };
    }
};


/**
 * Add book to user's library - US.7
 * @param {string} bookId - mongodb objectid of the book
 * @returns {object} { success, message, data }
 */
export const addToLibrary = async (bookId) => {
    try {
        const token = localStorage.getItem('token');

        if (!token) {
            return {
                success: false,
                message: 'You must be logged in to add books to your library'
            };
        }

        const response = await fetch(`${API_BASE}/library/add`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                book_id: bookId
            })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || 'Failed to add book to library');
        }

        return {
            success: true,
            message: data.message,
            data: data.data
        };

    } catch (error) {
        return {
            success: false,
            message: error.message || 'An error occurred while adding book to library'
        };
    }
};


/**
 * Get user's library with pagination - US.7
 * @param {number} page - page number for pagination (default: 1)
 * @param {number} limit - books per page (default: 12)
 * @param {string} status - filter by status: to-read, reading, completed (optional)
 * @returns {object} { success, data: books[], pagination }
 */
export const getLibrary = async (page = 1, limit = 12, status = '') => {
    try {
        const token = localStorage.getItem('token');

        if (!token) {
            return {
                success: false,
                message: 'You must be logged in to view your library',
                data: []
            };
        }

        const params = new URLSearchParams();
        params.append('page', page);
        params.append('limit', limit);
        if (status && ['want to read', 'currently reading', 'completed', 'dropped'].includes(status)) {
            params.append('status', status);
        }

        const response = await fetch(`${API_BASE}/library/?${params.toString()}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || 'Failed to fetch library');
        }

        return {
            success: true,
            data: data.data,
            pagination: data.pagination
        };

    } catch (error) {
        return {
            success: false,
            message: error.message || 'An error occurred while fetching your library',
            data: []
        };
    }
};


/**
 * Remove book from user's library - US.7
 * @param {string} bookId - mongodb objectid of the book
 * @returns {object} { success, message }
 */
export const removeFromLibrary = async (bookId) => {
    try {
        const token = localStorage.getItem('token');

        if (!token) {
            return {
                success: false,
                message: 'You must be logged in to remove books from your library'
            };
        }

        const response = await fetch(`${API_BASE}/library/${bookId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || 'Failed to remove book from library');
        }

        return {
            success: true,
            message: data.message
        };

    } catch (error) {
        return {
            success: false,
            message: error.message || 'An error occurred while removing book from library'
        };
    }
};


/**
 * Update reading status of a book in library - US.7
 * @param {string} bookId - mongodb objectid of the book
 * @param {string} status - reading status: to-read, reading, or completed
 * @returns {object} { success, message, data }
 */
export const updateLibraryStatus = async (bookId, status) => {
    try {
        const token = localStorage.getItem('token');

        if (!token) {
            return {
                success: false,
                message: 'You must be logged in to update book status'
            };
        }

        if (!['want to read', 'currently reading', 'completed', 'dropped'].includes(status)) {
            return {
                success: false,
                message: 'Invalid status. Must be: want to read, currently reading, completed, or dropped'
            };
        }

        const response = await fetch(`${API_BASE}/library/${bookId}/status`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                status: status
            })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || 'Failed to update book status');
        }

        return {
            success: true,
            message: data.message,
            data: data.data
        };

    } catch (error) {
        return {
            success: false,
            message: error.message || 'An error occurred while updating book status'
        };
    }
};