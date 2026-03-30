import { useState } from 'react';
import { registerUser } from '../api/auth';
import '../styles/Auth.css';

// Register component for user registration
// This component handles the registration form with validation and API integration
export default function Register() {
    // loading: True when form is being submitted to backend. Used to disable button and show loading state
    const [loading, setLoading] = useState(false);

    // error: Stores general error messages from API (like "Email already registered")
    const [error, setError] = useState('');

    // success: Stores success message after successful registration
    const [success, setSuccess] = useState('');

    // formData: Stores all form field values. Each field updates this object as user types
    const [formData, setFormData] = useState({
        username: '',
        email: '',
        password: '',
        confirmPassword: '',
    });

    // validationErrors: Stores error messages for each field. Shows below each input when validation fails
    const [validationErrors, setValidationErrors] = useState({});
    // validateForm: Checks all form fields and returns error messages for invalid fields
    // This runs when user clicks Register button
    const validateForm = () => {
        const errors = {};

        // Check username: must have 3-20 characters and only letters/numbers/_/-
        if (!formData.username.trim()) {
            errors.username = 'Username is required';
        } else if (formData.username.trim().length < 3) {
            errors.username = 'Username must be at least 3 characters';
        } else if (formData.username.trim().length > 20) {
            errors.username = 'Username cannot exceed 20 characters';
        } else if (!/^[a-zA-Z0-9_-]+$/.test(formData.username)) {
            errors.username = 'Username can only contain letters, numbers, underscores, and hyphens';
        }

        // Check email: must be valid format with @ symbol and domain
        if (!formData.email.trim()) {
            errors.email = 'Email is required';
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
            errors.email = 'Please enter a valid email address';
        }

        // Check password: minimum 8 characters and must have uppercase, lowercase and number
        if (!formData.password) {
            errors.password = 'Password is required';
        } else if (formData.password.length < 8) {
            errors.password = 'Password must be at least 8 characters';
        } else if (!/(?=.*[a-z])/.test(formData.password)) {
            errors.password = 'Password must contain at least one lowercase letter';
        } else if (!/(?=.*[A-Z])/.test(formData.password)) {
            errors.password = 'Password must contain at least one uppercase letter';
        } else if (!/(?=.*\d)/.test(formData.password)) {
            errors.password = 'Password must contain at least one number';
        }

        // Check confirm password: must match password field
        if (!formData.confirmPassword) {
            errors.confirmPassword = 'Please confirm your password';
        } else if (formData.password !== formData.confirmPassword) {
            errors.confirmPassword = 'Passwords do not match';
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
        setSuccess('');

        // Validate form
        const errors = validateForm();
        if (Object.keys(errors).length > 0) {
            setValidationErrors(errors);
            return;
        }

        setLoading(true);

        try {
            const result = await registerUser(
                formData.username,
                formData.email,
                formData.password
            );

            if (result.success) {
                setSuccess(result.message);
                setFormData({
                    username: '',
                    email: '',
                    password: '',
                    confirmPassword: '',
                });
                // Redirect after 2 seconds
                setTimeout(() => {
                    // Redirect to verification page or home
                    window.location.href = '/';
                }, 2000);
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
                {/* Logo */}
                <div className="logo-section">
                    <div className="logo-icon">
                        <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
                            {/* Book icon - minimalistic design */}
                            <defs>
                                <linearGradient id="bookGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                                    <stop offset="0%" style={{ stopColor: '#8B7355', stopOpacity: 1 }} />
                                    <stop offset="100%" style={{ stopColor: '#5a4a42', stopOpacity: 1 }} />
                                </linearGradient>
                            </defs>
                            {/* Open book pages */}
                            <path d="M 30 25 L 30 75 Q 50 70 50 50 Q 50 70 70 75 L 70 25 Q 50 30 50 50 Q 50 30 30 25" fill="url(#bookGradient)" />
                            {/* Book spine */}
                            <rect x="48" y="20" width="4" height="60" fill="#4a3a32" opacity="0.3" />
                            {/* Pages highlight */}
                            <path d="M 32 28 Q 50 32 50 50 Q 50 32 68 28" stroke="rgba(255,255,255,0.3)" strokeWidth="1" fill="none" />
                        </svg>
                    </div>
                    <h1>PageTurners</h1>
                </div>

                {/* Success Message */}
                {success && (
                    <div className="message success-message" role="alert">
                        <span className="message-icon">✓</span>
                        <div>
                            <p>{success}</p>
                        </div>
                    </div>
                )}

                {/* Error Message */}
                {error && (
                    <div className="message error-message" role="alert">
                        <span className="message-icon">✕</span>
                        <div>
                            <p>{error}</p>
                        </div>
                    </div>
                )}

                <form onSubmit={handleSubmit} className="auth-form">
                    {/* Email Field */}
                    <div className="form-group">
                        <label htmlFor="email">Please Enter Your Email</label>
                        <input
                            type="email"
                            id="email"
                            name="email"
                            value={formData.email}
                            onChange={handleChange}
                            placeholder="Enter your email"
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
                        <label htmlFor="password">Please Enter Your Password</label>
                        <input
                            type="password"
                            id="password"
                            name="password"
                            value={formData.password}
                            onChange={handleChange}
                            placeholder="minimum 8 characters"
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

                    {/* Confirm Password Field */}
                    <div className="form-group">
                        <label htmlFor="confirmPassword">Confirm Password</label>
                        <input
                            type="password"
                            id="confirmPassword"
                            name="confirmPassword"
                            value={formData.confirmPassword}
                            onChange={handleChange}
                            placeholder="Enter password"
                            disabled={loading}
                            className={validationErrors.confirmPassword ? 'input-error' : ''}
                            data-testid="confirm-password-input"
                        />
                        {validationErrors.confirmPassword && (
                            <p className="field-error" role="alert">
                                {validationErrors.confirmPassword}
                            </p>
                        )}
                    </div>

                    {/* Username Field */}
                    <div className="form-group">
                        <label htmlFor="username">Enter A Username</label>
                        <input
                            type="text"
                            id="username"
                            name="username"
                            value={formData.username}
                            onChange={handleChange}
                            placeholder="Enter username"
                            disabled={loading}
                            className={validationErrors.username ? 'input-error' : ''}
                            data-testid="username-input"
                        />
                        {validationErrors.username && (
                            <p className="field-error" role="alert">
                                {validationErrors.username}
                            </p>
                        )}
                    </div>

                    {/* Submit Button */}
                    <button
                        type="submit"
                        className="auth-button"
                        disabled={loading}
                        data-testid="register-submit-btn"
                    >
                        {loading ? 'Registering...' : 'Register'}
                    </button>
                </form>

                {/* Login Link */}
                <p className="auth-footer">
                    Already have an account?{' '}
                    <a href="/login" className="auth-link">
                        Log in
                    </a>
                </p>
            </div>
        </div>
    );
}
