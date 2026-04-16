// API_BASE_URL: Backend server address. All API calls go to http://localhost:5001/api
const API_BASE_URL = 'http://localhost:5001/api';
export const updateProgress = async (bookId, currentPage) => {
    const token = localStorage.getItem('token');
    try {
        const response = await fetch(`${API_BASE_URL}/library/${bookId}/progress`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ current_page: currentPage })
        });
        return await response.json();
    } catch (error) {
        return { success: false, message: "Network error" };
    }
};