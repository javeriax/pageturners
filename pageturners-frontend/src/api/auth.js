// API_BASE_URL: Backend server address. All API calls go to http://localhost:5001/api
const API_BASE_URL = 'http://localhost:5001/api';

// registerUser: Sends registration data to backend
// Takes username, email and password from form
// Backend should create new user in database and send verification email
// Returns {success: true/false, message: "error or success message"}
export const registerUser = async (username, email, password) => {
    try {
        // Send POST request to backend /api/auth/register endpoint
        const response = await fetch(`${API_BASE_URL}/auth/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                username,
                email,
                password,
            }),
        });

        // Parse response from backend
        const data = await response.json();

        // Check if request was successful (status 200-299 range)
        if (!response.ok) {
            throw new Error(data.message || 'Registration failed');
        }

        // Return success message to frontend
        return {
            success: true,
            message: data.message || 'Registration successful',
            data,
        };
    } catch (error) {
        // Return error message if something went wrong
        return {
            success: false,
            message: error.message || 'An error occurred during registration',
        };
    }
};

// verifyEmail: Verifies email using code sent to user's email
// Called after user clicks verification link in email
// Not yet used in frontend UI
export const verifyEmail = async (email, code) => {
    try {
        // Send POST request to backend /api/auth/verify-email endpoint
        const response = await fetch(`${API_BASE_URL}/auth/verify-email`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                email,
                verification_code: code,
            }),
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || 'Email verification failed');
        }

        return {
            success: true,
            message: data.message || 'Email verified successfully',
        };
    } catch (error) {
        return {
            success: false,
            message: error.message || 'An error occurred during email verification',
        };
    }
};

// loginUser: Sends login credentials to backend
// Takes email and password from form
// Backend verifies credentials and returns JWT token
// Returns {success: true/false, message: "error or success message", token: "JWT token"}
export const loginUser = async (email, password) => {
    try {
        // Send POST request to backend /api/auth/login endpoint
        const response = await fetch(`${API_BASE_URL}/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                email,
                password,
            }),
        });

        // Parse response from backend
        const data = await response.json();

        // Check if request was successful (status 200-299 range)
        if (!response.ok) {
            throw new Error(data.message || 'Login failed');
        }

        // Return success message and token to frontend
        return {
            success: true,
            message: data.message || 'Login successful',
            token: data.token,
            data,
        };
    } catch (error) {
        // Return error message if something went wrong
        return {
            success: false,
            message: error.message || 'An error occurred during login',
        };
    }
};

// forgotPassword: Sends password reset request to backend
// Takes email from form
// Backend sends password reset email with reset code
// Returns {success: true/false, message: "error or success message"}
export const forgotPassword = async (email) => {
    try {
        // Send POST request to backend /api/auth/forgot-password endpoint
        const response = await fetch(`${API_BASE_URL}/auth/forgot-password`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                email,
            }),
        });

        // Parse response from backend
        const data = await response.json();

        // Check if request was successful (status 200-299 range)
        if (!response.ok) {
            throw new Error(data.message || 'Password reset request failed');
        }

        // Return success message to frontend
        return {
            success: true,
            message: data.message || 'Password reset link sent to your email',
            data,
        };
    } catch (error) {
        // Return error message if something went wrong
        return {
            success: false,
            message: error.message || 'An error occurred during password reset request',
        };
    }
};

// resetPassword: Resets user password with reset code
// Takes email, reset code, and new password
// Backend validates code and updates password
// Returns {success: true/false, message: "error or success message"}
export const resetPassword = async (email, resetCode, newPassword) => {
    try {
        // Send POST request to backend /api/auth/reset-password endpoint
        const response = await fetch(`${API_BASE_URL}/auth/reset-password`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                email,
                reset_code: resetCode,
                new_password: newPassword,
            }),
        });

        // Parse response from backend
        const data = await response.json();

        // Check if request was successful (status 200-299 range)
        if (!response.ok) {
            throw new Error(data.message || 'Password reset failed');
        }

        // Return success message to frontend
        return {
            success: true,
            message: data.message || 'Password reset successful',
            data,
        };
    } catch (error) {
        // Return error message if something went wrong
        return {
            success: false,
            message: error.message || 'An error occurred during password reset',
        };
    }
};