// base url for backend
const API_BASE_URL = 'http://localhost:5001/api';

// helper function to make API requests:
const apiRequest = async (endpoint, method = 'POST', body = null, token = null) => {
    try {
        const headers = {
            'Content-Type': 'application/json',
        };
        // if token is provided, add Authorization header:
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }
        // make API request:
        const response = await fetch(`${API_BASE_URL}${endpoint}`, {
            method,
            headers,
            body: body ? JSON.stringify(body) : null,
        });
        //parse response and handle errors:
        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || 'Request failed');
        }

        return { success: true, data };

    } catch (error) {
        return {
            success: false,
            message: error.message || 'An error occurred',
        };
    }
};


// register new user:
export const registerUser = async (username, email, password) => {
    const result = await apiRequest('/auth/register', 'POST', {
        username,
        email,
        password,
    });

    if (!result.success) return result;

    return {
        success: true,
        message: result.data.message || 'Registration successful',
        data: result.data,
    };
};


// verify email:
export const verifyEmail = async (email, code) => {
    const result = await apiRequest('/auth/verify-email', 'POST', {
        email,
        verification_code: code,
    });

    if (!result.success) return result;

    return {
        success: true,
        message: result.data.message || 'Email verified successfully',
    };
};


// login:
export const loginUser = async (email, password) => {
    const result = await apiRequest('/auth/login', 'POST', {
        email,
        password,
    });

    if (!result.success) return result;

    return {
        success: true,
        message: result.data.message || 'Login successful',
        token: result.data.token,
        data: result.data,
    };
};


// logout:
export const logoutUser = async () => {
    const token = localStorage.getItem('token');

    const result = await apiRequest('/auth/logout', 'POST', null, token);

    // always clear token
    localStorage.removeItem('token');

    if (!result.success) return result;

    return {
        success: true,
        message: result.data.message || 'Logged out successfully',
    };
};


// forgot password:
export const forgotPassword = async (email) => {
    const result = await apiRequest('/auth/forgot-password', 'POST', {
        email,
    });

    if (!result.success) return result;

    return {
        success: true,
        message: result.data.message || 'Password reset link sent',
        data: result.data,
    };
};


// reset password:
export const resetPassword = async (email, resetCode, newPassword) => {
    const result = await apiRequest('/auth/reset-password', 'POST', {
        email,
        reset_code: resetCode,
        new_password: newPassword,
    });

    if (!result.success) return result;

    return {
        success: true,
        message: result.data.message || 'Password reset successful',
        data: result.data,
    };
};