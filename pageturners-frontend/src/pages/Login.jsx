import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { loginUser } from '../api/auth';
import '../styles/Auth.css';

/**
 * Login component - handles user login
 * Displays form for email and password with validation
 * Shows success/error messages and handles API calls
 */
export default function Login() {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [formData, setFormData] = useState({
        email: '',
        password: '',
    });
    const [validationErrors, setValidationErrors] = useState({});

    /**
     * Validate form inputs
     * @returns {Object} Object with validation errors, empty if no errors
     */
    const validateForm = () => {
        const errors = {};

        // Email validation
        if (!formData.email.trim()) {
            errors.email = 'Email is required';
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
            errors.email = 'Please enter a valid email address';
        }

        // Password validation
        if (!formData.password) {
            errors.password = 'Password is required';
        } else if (formData.password.length < 8) {
            errors.password = 'Password must be at least 8 characters';
        }

        return errors;
    };

    /**
     * Handle input changes
     */
    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({
            ...prev,
            [name]: value,
        }));
        // Clear validation error for this field when user starts typing
        if (validationErrors[name]) {
            setValidationErrors((prev) => ({
                ...prev,
                [name]: '',
            }));
        }
    };

    /**
     * Handle form submission
     */
    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        // Validate form
        const errors = validateForm();
        if (Object.keys(errors).length > 0) {
            setValidationErrors(errors);
            return;
        }

        setLoading(true);

        try {
            const result = await loginUser(formData.email, formData.password);

            if (result.success) {
                // Redirect to dashboard or home page
                navigate('/');
            } else {
                setError(result.message);
            }
        } catch (err) {
            setError(err.message || 'An unexpected error occurred');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-container">
            <div className="auth-card">
                <h1>Welcome Back</h1>
                <p className="auth-subtitle">Login to your PageTurners account</p>

                {/* Error Message */}
                {error && (
                    <div className="message error-message" role="alert">
                        <span className="message-icon">✕</span>
                        <div>
                            <p className="message-title">Error</p>
                            <p>{error}</p>
                        </div>
                    </div>
                )}

                <form onSubmit={handleSubmit} className="auth-form">
                    {/* Email Field */}
                    <div className="form-group">
                        <label htmlFor="email">Email Address</label>
                        <input
                            type="email"
                            id="email"
                            name="email"
                            value={formData.email}
                            onChange={handleChange}
                            placeholder="your.email@example.com"
                            disabled={loading}
                            className={validationErrors.email ? 'input-error' : ''}
                            data-testid="email-input"
                        />
                        {validationErrors.email && (
                            <p className="field-error" role="alert">
                                {validationErrors.email}
                            </p>
                        )}
                    </div>

                    {/* Password Field */}
                    <div className="form-group">
                        <label htmlFor="password">Password</label>
                        <input
                            type="password"
                            id="password"
                            name="password"
                            value={formData.password}
                            onChange={handleChange}
                            placeholder="Enter your password"
                            disabled={loading}
                            className={validationErrors.password ? 'input-error' : ''}
                            data-testid="password-input"
                        />
                        {validationErrors.password && (
                            <p className="field-error" role="alert">
                                {validationErrors.password}
                            </p>
                        )}
                    </div>

                    {/* Forgot Password Link */}
                    <Link to="/forgot-password" className="auth-link forgot-password-link">
                        Forgot your password?
                    </Link>

                    {/* Submit Button */}
                    <button
                        type="submit"
                        className="auth-button"
                        disabled={loading}
                        data-testid="login-submit-btn"
                    >
                        {loading ? 'Logging In...' : 'Login'}
                    </button>
                </form>

                {/* Register Link */}
                <p className="auth-footer">
                    Don't have an account?{' '}
                    <Link to="/register" className="auth-link">
                        Register here
                    </Link>
                </p>
            </div>
        </div>
    );
}
