// api/dashboard.js
// all api calls related to dashboard - featured books, search, and genre filtering
// used by Dashboard.jsx

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
