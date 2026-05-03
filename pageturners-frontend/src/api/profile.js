// Profile API calls - handles user profile updates, password changes, picture uploads
// Used by Profile.jsx

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';

//  HELPERS 

const getToken = () => localStorage.getItem('token');

const authHeader = () => ({
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${getToken()}`
});

const handleUnauthorized = () => {
    localStorage.removeItem('token');
    window.location.href = '/login';
};

const parseResponse = async (response) => {
    const data = await response.json();
    if (response.status === 401) handleUnauthorized();
    return { data, ok: response.ok, status: response.status };
};

const apiCall = async (url, options) => {
    try {
        const response = await fetch(url, { headers: authHeader(), ...options });
        const { data, ok, status } = await parseResponse(response);
        if (!ok) return { success: false, message: data.message || 'An error occurred' };
        return { success: true, message: data.message, data: data.data };
    } catch (error) {
        return { success: false, message: error.message || 'An error occurred' };
    }
};

//  API FUNCTIONS 

// FR6.1: Fetch current user's profile
export const getProfile = () =>
    apiCall(`${API_BASE}/profile`, { method: 'GET' });

// FR6.2: Update bio, username, or email
export const updateProfile = (updates) =>
    apiCall(`${API_BASE}/profile`, {
        method: 'PATCH',
        body: JSON.stringify(updates)
    });

// FR7.3: Change password
export const changePassword = (currentPassword, newPassword) =>
    apiCall(`${API_BASE}/profile/password`, {
        method: 'POST',
        body: JSON.stringify({ current_password: currentPassword, new_password: newPassword })
    });

// FR8: Upload profile picture (base64)
export const uploadProfilePicture = async (base64Image) => {
    if (!getToken()) return { success: false, message: 'You must be logged in.' };
    const result = await apiCall(`${API_BASE}/profile/picture`, {
        method: 'POST',
        body: JSON.stringify({ image: base64Image })
    });
    return result;
};