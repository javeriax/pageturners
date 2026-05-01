// dashboard api - all calls related to book discovery, search, and filtering
// fetches featured books, genres, and search results for Dashboard.jsx

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';

// get jwt token from localStorage for authenticated requests
const getToken = () => localStorage.getItem('token');

// build authorization header with jwt token
const authHeader = () => ({
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${getToken()}`
});

// search and filter books by keyword and genres with pagination
export const searchBooks = async (search = '', genres = [], page = 1, limit = 12) => {
    try {
        // build query parameters from search terms and filters
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

// load the 3 featured rows of books on dashboard load (Popular Picks, New Arrivals, Random)
// each row contains 20 books fetched in a single efficient query
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

// fetch all available genres for the genre filter dropdown
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
