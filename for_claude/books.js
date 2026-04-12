// api/books.js
// all api calls related to books - search, filter, featured, details
// used by Dashboard.jsx and BookDetails.jsx

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';

// helper to get jwt token from localstorage
const getToken = () => localStorage.getItem('token');

// helper to build authorization header
const authHeader = () => ({
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${getToken()}`
});


/**
 * fetch books with optional search and genre filters - UC3
 * @param {string} search - keyword to search by title or author
 * @param {string[]} genres - array of selected genres e.g. ['Fantasy', 'Romance']
 * @param {number} page - page number for pagination
 * @param {number} limit - books per page
 * @returns {object} { success, data, pagination, message }
 */
export const searchBooks = async (search = '', genres = [], page = 1, limit = 12) => {
    try {
        // build query string from parameters
        const params = new URLSearchParams();

        if (search.trim()) params.append('search', search.trim());
        if (genres.length > 0) params.append('genre', genres.join(','));
        params.append('page', page);
        params.append('limit', limit);

        const response = await fetch(`${API_BASE}/books/?${params.toString()}`, {
            method: 'GET',
            headers: authHeader()
        });

        const data = await response.json();
        return data;

    } catch (error) {
        console.error('search books error:', error);
        return {
            success: false,
            message: 'Failed to connect to server',
            data: []
        };
    }
};


/**
 * fetch initial 3 rows of books for dashboard - single fast query
 * returns row1, row2, row3 each with 20 books
 * will be replaced with top rated books once reviews are implemented
 * @returns {object} { success, data: { row1: [...], row2: [...], row3: [...] } }
 */
export const getInitialBooks = async () => {
    try {
        const response = await fetch(`${API_BASE}/books/initial`, {
            method: 'GET',
            headers: authHeader()
        });

        const data = await response.json();
        return data;

    } catch (error) {
        console.error('get initial books error:', error);
        return {
            success: false,
            message: 'Failed to connect to server',
            data: { row1: [], row2: [], row3: [] }
        };
    }
};


/**
 * fetch all available genres for the filter dropdown
 * @returns {object} { success, data: ['Fantasy', 'Romance', ...] }
 */
export const getGenres = async () => {
    try {
        const response = await fetch(`${API_BASE}/books/genres`, {
            method: 'GET',
            headers: authHeader()
        });

        const data = await response.json();
        return data;

    } catch (error) {
        console.error('get genres error:', error);
        return {
            success: false,
            data: []
        };
    }
};


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

//                             REVIEWS API FUNCTIONS

// submitReview: Send user's rating and review to backend
// Takes book_id, rating (1-5), and review_text
// Returns {success, message, data with updated avg_rating and review_count}
// export const submitReview = async (bookId, rating, reviewText) => {
//     try {
//         const token = localStorage.getItem('token');
        
//         if (!token) {
//             return {
//                 success: false,
//                 message: 'You must be logged in to submit a review'
//             };
//         }
        
//         const response = await fetch(`${API_BASE_URL}/books/${bookId}/reviews`, {
//             method: 'POST',
//             headers: {
//                 'Content-Type': 'application/json',
//                 'Authorization': `Bearer ${token}` // Send JWT token for authentication
//             },
//             body: JSON.stringify({
//                 rating,
//                 review_text: reviewText
//             })
//         });
        
//         const data = await response.json();
        
//         if (!response.ok) {
//             throw new Error(data.message || 'Failed to submit review');
//         }
        
//         return {
//             success: true,
//             message: data.message,
//             data: data.data
//         };
//     } catch (error) {
//         return {
//             success: false,
//             message: error.message || 'An error occurred while submitting your review'
//         };
//     }
// };

// // getBookReviews: Fetch all reviews for a book
// export const getBookReviews = async (bookId) => {
//     try {
//         const token = localStorage.getItem('token');
        
//         const response = await fetch(`${API_BASE_URL}/books/${bookId}/reviews`, {
//             method: 'GET',
//             headers: {
//                 'Authorization': `Bearer ${token}`
//             }
//         });
        
//         const data = await response.json();
        
//         if (!response.ok) {
//             throw new Error(data.message || 'Failed to fetch reviews');
//         }
        
//         return {
//             success: true,
//             data: data.data
//         };
//     } catch (error) {
//         return {
//             success: false,
//             message: error.message || 'An error occurred while fetching reviews'
//         };
//     }
// };



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