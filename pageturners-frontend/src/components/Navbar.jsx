import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { logoutUser } from '../api/auth';
import '../styles/Navbar.css';

export default function Navbar() {
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    // Check if user is logged in on component mount
    useEffect(() => {
        const token = localStorage.getItem('token');
        setIsLoggedIn(!!token);
    }, []);

    const handleLogout = async () => {
        setLoading(true);

        try {
            const result = await logoutUser();

            if (result.success) {
                setIsLoggedIn(false);
                // Redirect to login page
                navigate('/login');
            } else {
                alert(result.message);
            }
        } catch (error) {
            alert('Logout failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <nav className="navbar">
            <div className="navbar-container">
                {/* Logo/Brand */}
                <div className="navbar-brand">
                    <a href="/" className="brand-link">
                        <span className="brand-icon">📚</span>
                        <span className="brand-text">PageTurners</span>
                    </a>
                </div>

                {/* Navigation Links */}
                <div className="navbar-menu">
                    <a href="/" className="nav-link">Home</a>
                    <a href="/dashboard" className="nav-link">Dashboard</a>
                    <a href="/library" className="nav-link">My Library</a>
                </div>

                {/* User Actions */}
                <div className="navbar-actions">
                    {isLoggedIn ? (
                        <button
                            className="logout-btn"
                            onClick={handleLogout}
                            disabled={loading}
                        >
                            {loading ? 'Logging out...' : 'Logout'}
                        </button>
                    ) : (
                        <>
                            <a href="/login" className="nav-link">Login</a>
                            <a href="/register" className="nav-link nav-link-primary">Register</a>
                        </>
                    )}
                </div>
            </div>
        </nav>
    );
}
