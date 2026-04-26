import { useState, useEffect } from 'react';
import { loginUser } from '../api/auth';
import { useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import React from 'react';
import ForgotPasswordModal from '../components/ForgotPasswordModal';
import ResetPasswordModal from '../components/ResetPasswordModal';
import '../styles/Auth.css';

// Login component for user authentication
// This component handles the login form with validation and API integration
export default function Login() {
    // Get URL parameters to detect reset password link
    const [searchParams] = useSearchParams();

    // loading: True when form is being submitted to backend. Used to disable button and show loading state
    const [loading, setLoading] = useState(false);

    // error: Stores error messages from API (like "Incorrect email or password")
    const [error, setError] = useState('');

    // forgotPasswordModalOpen: Controls whether the forgot password modal is visible
    const [forgotPasswordModalOpen, setForgotPasswordModalOpen] = useState(false);

    // resetPasswordModalOpen: Controls whether the reset password modal is visible
    const [resetPasswordModalOpen, setResetPasswordModalOpen] = useState(false);

    // resetEmail and resetCode: Store email and code from URL parameters for reset modal
    const [resetEmail, setResetEmail] = useState('');
    const [resetCode, setResetCode] = useState('');

    // formData: Stores all form field values. Each field updates this object as user types
    const [formData, setFormData] = useState({
        email: '',
        password: '',
    });

    // validationErrors: Stores error messages for each field. Shows below each input when validation fails
    const [validationErrors, setValidationErrors] = useState({});
    //used useRef to create a synchronous submission 
    // lock that prevents duplicate API calls during rapid user interactions.
    const isSubmitting = useRef(false);

    // Detect reset password link and auto-open modal
    useEffect(() => {
        const email = searchParams.get('email');
        const code = searchParams.get('code');

        if (email && code) {
            setResetEmail(email);
            setResetCode(code);
            setResetPasswordModalOpen(true);
        }
    }, [searchParams]);
    // validateForm: Checks all form fields and returns error messages for invalid fields
    // This runs when user clicks Login button
    const validateForm = () => {
        const errors = {};

        // Check email: must have @ symbol and domain
        if (!formData.email.trim()) {
            errors.email = 'Email is required';
        } else if (!formData.email.includes('@')) {
            errors.email = 'Email must include the @ symbol (e.g., name@example.com)';
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
            errors.email = 'Please enter a valid email address with domain (e.g., name@example.com)';
        }

        // Check password: must not be empty
        if (!formData.password) {
            errors.password = 'Password is required';
        }

        return errors;
    };

    /**
     * Handle input changes - update form data as user types
     */
    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({
            ...prev,
            [name]: value,
        }));

        // Clear validation error when user starts typing
        if (validationErrors[name]) {
            setValidationErrors((prev) => ({
                ...prev,
                [name]: '',
            }));
        }
    };

    /**
     * Handle form submission - validate and send login request
     */
    const handleSubmit = async (e) => {
        e.preventDefault();
        if (isSubmitting.current) return;
        isSubmitting.current = true;
        setError('');

        // Validate form
        const errors = validateForm();
        if (Object.keys(errors).length > 0) {
            isSubmitting.current = false;
            setValidationErrors(errors);
            return;
        }

        setLoading(true);

        try {
            const result = await loginUser(formData.email, formData.password);

            if (result.success) {
                // Store JWT token in localStorage for future API calls
                localStorage.setItem('token', result.token);
                // localStorage.setItem('username', data.data?.username || '');
                // Redirect to  dashboard
                window.location.href = '/dashboard';
            } else {
                // Show error message from backend
                setError(result.message);
            }
        } catch (err) {
            setError(err.message || 'An unexpected error occurred');
        } finally {
            isSubmitting.current = false;
            setLoading(false);
        }
    };

    return (
        <div className="auth-container">
            <div className="auth-card">
                {/* Logo section */}
                <div className="logo-section">
                    <div className="logo-icon">
                        <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
                            {/* Book icon SVG */}
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
                        <label htmlFor="email">Email</label>
                        <input
                            type="email"
                            id="email"
                            name="email"
                            value={formData.email}
                            onChange={handleChange}
                            placeholder="name@example.com"
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

                    {/* Submit Button */}
                    <button
                        type="submit"
                        className="auth-button"
                        disabled={loading}
                        data-testid="login-submit-btn"
                    >
                        {loading ? 'Logging in...' : 'Login'}
                    </button>
                </form>

                {/* Footer with links */}
                <p className="auth-footer">
                    <button
                        type="button"
                        className="auth-link"
                        onClick={() => setForgotPasswordModalOpen(true)}
                        data-testid="forgot-password-btn"
                    >
                        Forgot Password?
                    </button>
                    {' • '}
                    <a href="/register" className="auth-link">
                        Sign Up
                    </a>
                </p>

                {/* Forgot Password Modal */}
                <ForgotPasswordModal
                    isOpen={forgotPasswordModalOpen}
                    onClose={() => setForgotPasswordModalOpen(false)}
                />

                {/* Reset Password Modal (auto-opens when user clicks email reset link) */}
                <ResetPasswordModal
                    isOpen={resetPasswordModalOpen}
                    onClose={() => setResetPasswordModalOpen(false)}
                    email={resetEmail}
                    resetCode={resetCode}
                />
            </div>
        </div>
    );
}