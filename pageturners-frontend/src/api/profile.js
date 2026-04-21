// Profile API calls - handles user profile updates, password changes, picture uploads
// Used by Profile.jsx

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';

const getToken = () => localStorage.getItem('token');

const authHeader = () => ({
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${getToken()}`
});

// FR6.1: GET /api/profile - Fetch current user's profile data
export const getProfile = async () => {
    try {
        const response = await fetch(`${API_BASE}/profile`, {
            method: 'GET',
            headers: authHeader()
        });

        const data = await response.json();

        if (!response.ok) {
            // FR6.4: Handle 401 Unauthorized (token expired)
            if (response.status === 401) {
                localStorage.removeItem('token');
                window.location.href = '/login';
            }
            throw new Error(data.message || 'Failed to fetch profile');
        }

        return {
            success: true,
            data: data.data
        };
    } catch (error) {
        return {
            success: false,
            message: error.message || 'An error occurred while fetching profile'
        };
    }
};

// FR6.2: PATCH /api/profile - Update bio, username, email
export const updateProfile = async (updates) => {
    try {
        const response = await fetch(`${API_BASE}/profile`, {
            method: 'PATCH',
            headers: authHeader(),
            body: JSON.stringify(updates)
        });

        const data = await response.json();

        if (!response.ok) {
            // FR7.1: Handle 409 - Username already taken
            if (response.status === 409) {
                return {
                    success: false,
                    message: data.message || 'Username already taken'
                };
            }
            // FR7.2: Handle 400 - Invalid email format
            if (response.status === 400) {
                return {
                    success: false,
                    message: data.message || 'Invalid input'
                };
            }
            // FR6.4: Handle 401 Unauthorized
            if (response.status === 401) {
                localStorage.removeItem('token');
                window.location.href = '/login';
            }
            throw new Error(data.message || 'Failed to update profile');
        }

        return {
            success: true,
            message: data.message,
            data: data.data
        };
    } catch (error) {
        return {
            success: false,
            message: error.message || 'An error occurred while updating profile'
        };
    }
};

// FR7.3: POST /api/profile/password - Change password
export const changePassword = async (currentPassword, newPassword) => {
    try {
        const response = await fetch(`${API_BASE}/profile/password`, {
            method: 'POST',
            headers: authHeader(),
            body: JSON.stringify({
                current_password: currentPassword,
                new_password: newPassword
            })
        });

        const data = await response.json();

        if (!response.ok) {
            // FR7.4: Handle 400 - Current password incorrect
            if (response.status === 400) {
                return {
                    success: false,
                    message: data.message || 'Current password is incorrect'
                };
            }
            // FR6.4: Handle 401 Unauthorized
            if (response.status === 401) {
                localStorage.removeItem('token');
                window.location.href = '/login';
            }
            throw new Error(data.message || 'Failed to change password');
        }

        return {
            success: true,
            message: data.message
        };
    } catch (error) {
        return {
            success: false,
            message: error.message || 'An error occurred while changing password'
        };
    }
};

// FR8: POST /api/profile/picture - Upload profile picture
export const uploadProfilePicture = async (base64Image) => {
    try {
        const token = localStorage.getItem('token');
        
        if (!token) {
            return {
                success: false,
                message: 'You must be logged in.'
            };
        }
        
        const response = await fetch(`${API_BASE}/profile/picture`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ image: base64Image })
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            if (response.status === 400) {
                return {
                    success: false,
                    message: data.message || 'Only JPG/PNG/JPEG files allowed'
                };
            }
            if (response.status === 401) {
                localStorage.removeItem('token');
                window.location.href = '/login';
            }
            throw new Error(data.message || 'Failed to upload picture');
        }


        return {
            success: true,
            message: data.message,
            data: {
                // profile_picture: `http://localhost:5001${data.data.profile_picture}`
                profile_picture: data.data.profile_picture

            }
        };
    } catch (error) {
        return {
            success: false,
            message: error.message || 'An error occurred while uploading picture'
        };
    }
};