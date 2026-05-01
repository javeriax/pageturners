import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { registerUser } from '../api/auth';
import '../styles/Auth.css';

export default function Register() {
    const navigate = useNavigate();

    // form state
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [formData, setFormData] = useState({
        username: '',
        email: '',
        password: '',
        confirmPassword: '',
    });
    const [validationErrors, setValidationErrors] = useState({});
    const [showRequirements, setShowRequirements] = useState(false);

    // check if password meets all requirements
    const checkPasswordRequirements = (pwd) => {
        return {
            hasMinLength: pwd.length >= 8,
            hasLowercase: /(?=.*[a-z])/.test(pwd),
            hasUppercase: /(?=.*[A-Z])/.test(pwd),
            hasNumber: /(?=.*\d)/.test(pwd),
        };
    };

    // validate all form fields and return error object
    const validateForm = () => {
        const errors = {};
        const rawUsername = formData.username;
        const trimmedUsername = rawUsername.trim();

        // username must be 3-20 chars with letters, numbers, underscore, hyphen
        if (!trimmedUsername) {
            errors.username = 'Username is required';
        } else if (trimmedUsername.length < 3) {
            errors.username = 'Username must be at least 3 characters';
        } else if (trimmedUsername.length > 20) {
            errors.username = 'Username cannot exceed 20 characters';
        } else if (!/^[a-zA-Z0-9_-]+$/.test(rawUsername)) {
            errors.username = 'Username can only contain letters, numbers, underscores, and hyphens';
        }

        // email must be valid format
        if (!formData.email.trim()) {
            errors.email = 'Email is required';
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
            errors.email = 'Please enter a valid email address';
        }

        // password must be at least 8 chars with uppercase, lowercase, and number
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

        // confirm password must match
        if (!formData.confirmPassword) {
            errors.confirmPassword = 'Please confirm your password';
        } else if (formData.password !== formData.confirmPassword) {
            errors.confirmPassword = 'Passwords do not match';
        }

        return errors;
    };

    // update form field value and clear its error message
    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));

        // clear error for this field as user types
        if (validationErrors[name]) {
            setValidationErrors((prev) => ({ ...prev, [name]: '' }));
        }
    };

    // submit form - validate then send to backend
    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        // check for validation errors
        const errors = validateForm();
        if (Object.keys(errors).length > 0) {
            setValidationErrors(errors);
            return;
        }

        setLoading(true);

        try {
            const result = await registerUser(formData.username, formData.email, formData.password);

            if (result.success) {
                setSuccess(result.message);
                const userEmail = formData.email;
                // reset form fields
                setFormData({ username: '', email: '', password: '', confirmPassword: '' });

                // redirect to email verification after 2 seconds
                setTimeout(() => {
                    navigate('/verify-email', { state: { email: userEmail } });
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
                <div className="logo-section">
                    <div className="logo-icon">⚔️</div>
                    <h1>PageTurners</h1>
                </div>

                {success && <div className="message success-message"><p>{success}</p></div>}
                {error && <div className="message error-message"><p>{error}</p></div>}

                <form onSubmit={handleSubmit} className="auth-form" noValidate>
                    {/* email field */}
                    <div className="form-group">
                        <label htmlFor="email">Email</label>
                        <input
                            id="email"
                            type="email"
                            name="email"
                            value={formData.email}
                            onChange={handleChange}
                            disabled={loading}
                            data-testid="email-input"
                        />
                        {validationErrors.email && <span className="error-text">{validationErrors.email}</span>}
                    </div>

                    {/* password field with collapsible requirements checklist */}
                    <div className="form-group">
                        <div className="password-label-section">
                            <label htmlFor="password">Password</label>
                            <button
                                type="button"
                                className="requirements-toggle"
                                onClick={() => setShowRequirements(!showRequirements)}
                            >
                                <span className={`toggle-icon ${showRequirements ? 'open' : ''}`}>▶</span>
                                Requirements
                            </button>
                        </div>
                        <input
                            id="password"
                            type="password"
                            name="password"
                            value={formData.password}
                            onChange={handleChange}
                            disabled={loading}
                            data-testid="password-input"
                        />
                        {validationErrors.password && <span className="error-text">{validationErrors.password}</span>}

                        {/* show checklist when user clicks Requirements button */}
                        {showRequirements && (
                            <div className="requirements-checklist">
                                <div className={`requirement-item ${checkPasswordRequirements(formData.password).hasMinLength ? 'met' : ''}`}>
                                    <span className="checkmark">✓</span> <span>At least 8 characters</span>
                                </div>
                                <div className={`requirement-item ${checkPasswordRequirements(formData.password).hasLowercase ? 'met' : ''}`}>
                                    <span className="checkmark">✓</span> <span>One lowercase letter (a-z)</span>
                                </div>
                                <div className={`requirement-item ${checkPasswordRequirements(formData.password).hasUppercase ? 'met' : ''}`}>
                                    <span className="checkmark">✓</span> <span>One uppercase letter (A-Z)</span>
                                </div>
                                <div className={`requirement-item ${checkPasswordRequirements(formData.password).hasNumber ? 'met' : ''}`}>
                                    <span className="checkmark">✓</span> <span>One number (0-9)</span>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* confirm password field */}
                    <div className="form-group">
                        <label htmlFor="confirmPassword">Confirm Password</label>
                        <input
                            id="confirmPassword"
                            type="password"
                            name="confirmPassword"
                            value={formData.confirmPassword}
                            onChange={handleChange}
                            disabled={loading}
                            data-testid="confirm-password-input"
                        />
                        {validationErrors.confirmPassword && <span className="error-text">{validationErrors.confirmPassword}</span>}
                    </div>

                    {/* username field */}
                    <div className="form-group">
                        <label htmlFor="username">Username</label>
                        <input
                            id="username"
                            type="text"
                            name="username"
                            value={formData.username}
                            onChange={handleChange}
                            disabled={loading}
                            data-testid="username-input"
                        />
                        {validationErrors.username && <span className="error-text">{validationErrors.username}</span>}
                    </div>

                    <button
                        type="submit"
                        className="auth-button"
                        disabled={loading}
                        data-testid="register-submit-btn"
                    >
                        {loading ? 'Creating Account...' : 'Register'}
                    </button>
                </form>
                <p className="auth-footer">
                    Already have an account? <a href="/login" className="auth-link">Log in</a>
                </p>
            </div>
        </div>
    );
}