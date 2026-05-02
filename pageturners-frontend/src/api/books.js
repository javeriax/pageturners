// api/books.js
// all api calls related to book details, reviews, and library management

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';

// helper to get token
const getToken = () => localStorage.getItem('token');

// helper to build headers
const buildHeaders = (withJson = false) => {
    const headers = {};
    const token = getToken();

    if (withJson) headers['Content-Type'] = 'application/json';
    if (token) headers['Authorization'] = `Bearer ${token}`;

    return headers;
};

// reusable request handler
const apiRequest = async (url, options = {}) => {
    try {
        const response = await fetch(url, options);
        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || 'Request failed');
        }

        return { success: true, data };
    } catch (error) {
        return {
            success: false,
            message: error.message || 'An error occurred'
        };
    }
};


//fetch full book details with reviews
export const getBookDetails = async (bookId) => {
    const result = await apiRequest(`${API_BASE}/books/${bookId}`, {
        method: 'GET',
        headers: buildHeaders()
    });

    return result.success
        ? result.data
        : { success: false, message: result.message, data: null };
};


//submit review
export const submitReview = async (bookId, rating, reviewText) => {
    if (!getToken()) {
        return { success: false, message: 'You must be logged in to submit a review' };
    }

    const result = await apiRequest(`${API_BASE}/books/${bookId}/reviews`, {
        method: 'POST',
        headers: buildHeaders(true),
        body: JSON.stringify({
            rating,
            review_text: reviewText
        })
    });

    return result.success
        ? { success: true, message: result.data.message, data: result.data.data }
        : { success: false, message: result.message };
};


/*get reviews*/
export const getBookReviews = async (bookId) => {
    const result = await apiRequest(`${API_BASE}/books/${bookId}/reviews`, {
        method: 'GET',
        headers: buildHeaders()
    });

    return result.success
        ? { success: true, data: result.data.data }
        : { success: false, message: result.message };
};


/*delete review*/
export const deleteReview = async (bookId, reviewId) => {
    if (!getToken()) {
        return { success: false, message: 'You must be logged in to delete a review' };
    }

    const result = await apiRequest(`${API_BASE}/books/${bookId}/reviews/${reviewId}`, {
        method: 'DELETE',
        headers: buildHeaders()
    });

    return result.success
        ? { success: true, message: result.data.message, data: result.data.data }
        : { success: false, message: result.message };
};


/*add to library*/
export const addToLibrary = async (bookId) => {
    if (!getToken()) {
        return { success: false, message: 'You must be logged in to add books to your library' };
    }

    const result = await apiRequest(`${API_BASE}/library/add`, {
        method: 'POST',
        headers: buildHeaders(true),
        body: JSON.stringify({ book_id: bookId })
    });

    return result.success
        ? { success: true, message: result.data.message, data: result.data.data }
        : { success: false, message: result.message };
};


/*get library*/
export const getLibrary = async (page = 1, limit = 12, status = '') => {
    if (!getToken()) {
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

    const result = await apiRequest(`${API_BASE}/library/?${params.toString()}`, {
        method: 'GET',
        headers: buildHeaders()
    });

    return result.success
        ? { success: true, data: result.data.data, pagination: result.data.pagination }
        : { success: false, message: result.message, data: [] };
};


/*remove from library*/
export const removeFromLibrary = async (bookId) => {
    if (!getToken()) {
        return { success: false, message: 'You must be logged in to remove books from your library' };
    }

    const result = await apiRequest(`${API_BASE}/library/${bookId}`, {
        method: 'DELETE',
        headers: buildHeaders()
    });

    return result.success
        ? { success: true, message: result.data.message }
        : { success: false, message: result.message };
};


/*update library status*/
export const updateLibraryStatus = async (bookId, status) => {
    if (!getToken()) {
        return { success: false, message: 'You must be logged in to update book status' };
    }

    if (!['want to read', 'currently reading', 'completed', 'dropped'].includes(status)) {
        return {
            success: false,
            message: 'Invalid status. Must be: want to read, currently reading, completed, or dropped'
        };
    }

    const result = await apiRequest(`${API_BASE}/library/${bookId}/status`, {
        method: 'PATCH',
        headers: buildHeaders(true),
        body: JSON.stringify({ status })
    });

    return result.success
        ? { success: true, message: result.data.message, data: result.data.data }
        : { success: false, message: result.message };
};