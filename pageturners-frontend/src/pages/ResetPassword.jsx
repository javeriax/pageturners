import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { resetPassword } from '../api/auth';
import '../styles/Auth.css';

function ResetPassword() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();

    // The status can be: 'idle', 'resetting', 'success', or 'error'
    const [status, setStatus] = useState('idle');
    const [message, setMessage] = useState('');

    // Pre-fill email and code from URL
    const [email] = useState(searchParams.get('email') || '');
    const [resetCode] = useState(searchParams.get('code') || '');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    // Validation errors
    const [validationErrors, setValidationErrors] = useState({});

    useEffect(() => {
        // If no email or code in URL, show error
        if (!email || !resetCode) {
            setStatus('error');
            setMessage('Invalid reset link. Missing email or reset code. Please request a new password reset.');
        } else {
            setStatus('idle');
            setMessage('Enter your new password to reset your account.');
        }
    }, [email, resetCode]);

    /**
     * Validate password reset form
     */
    const validateResetForm = () => {
        const errors = {};

        if (!newPassword) {
            errors.newPassword = 'New password is required';
        } else if (newPassword.length < 8) {
            errors.newPassword = 'Password must be at least 8 characters long';
        } else if (!/(?=.*[a-z])/.test(newPassword)) {
            errors.newPassword = 'Password must contain at least one lowercase letter';
        } else if (!/(?=.*[A-Z])/.test(newPassword)) {
            errors.newPassword = 'Password must contain at least one uppercase letter';
        } else if (!/(?=.*\d)/.test(newPassword)) {
            errors.newPassword = 'Password must contain at least one number';
        }

        if (!confirmPassword) {
            errors.confirmPassword = 'Please confirm your password';
        } else if (newPassword !== confirmPassword) {
            errors.confirmPassword = 'Passwords do not match';
        }

        return errors;
    };

    const handleResetPassword = async (e) => {
        e.preventDefault();
        setMessage('');

        const errors = validateResetForm();
        if (Object.keys(errors).length > 0) {
            setValidationErrors(errors);
            return;
        }

        setStatus('resetting');
        setMessage('Resetting your password... please wait.');

        try {
            const response = await resetPassword(email, resetCode, newPassword);

            if (response.success) {
                setStatus('success');
                setMessage('Password reset successfully! Redirecting to login...');
                setValidationErrors({});

                // Redirect to Login after success
                setTimeout(() => {
                    navigate('/login');
                }, 2000);
            } else {
                setStatus('error');
                setMessage(response.message || 'Password reset failed. Please try again or request a new reset link.');
            }
        } catch (error) {
            setStatus('error');
            setMessage('Server error. Please check your connection and try again.');
        }
    };

    return (
        <div className="auth-container">
            <div className="auth-card">
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

                <h2>Reset Your Password</h2>

                {/* Status Message */}
                {message && (
                    <div className={`message ${status === 'resetting' ? 'info' : status}-message`} style={{ marginBottom: '20px' }}>
                        <p>{message}</p>
                    </div>
                )}

                {/* Show form only if we have valid email and code, and not in success/resetting state */}
                {email && resetCode && status !== 'success' && status !== 'resetting' && status !== 'error' && (
                    <form onSubmit={handleResetPassword} className="auth-form">
                        <div className="form-group">
                            <label htmlFor="email">Email Address</label>
                            <input
                                type="email"
                                id="email"
                                value={email}
                                readOnly
                                style={{ backgroundColor: '#f5f5f5', color: '#666', cursor: 'not-allowed' }}
                            />
                        </div>

                        <div className="form-group">
                            <label htmlFor="new-password">New Password</label>
                            <input
                                type="password"
                                id="new-password"
                                value={newPassword}
                                onChange={(e) => {
                                    setNewPassword(e.target.value);
                                    if (validationErrors.newPassword) {
                                        setValidationErrors((prev) => ({
                                            ...prev,
                                            newPassword: '',
                                        }));
                                    }
                                }}
                                placeholder="At least 8 characters with uppercase, lowercase, and number"
                                className={validationErrors.newPassword ? 'input-error' : ''}
                            />
                            {validationErrors.newPassword && (
                                <p className="field-error" role="alert">
                                    {validationErrors.newPassword}
                                </p>
                            )}
                        </div>

                        <div className="form-group">
                            <label htmlFor="confirm-password">Confirm Password</label>
                            <input
                                type="password"
                                id="confirm-password"
                                value={confirmPassword}
                                onChange={(e) => {
                                    setConfirmPassword(e.target.value);
                                    if (validationErrors.confirmPassword) {
                                        setValidationErrors((prev) => ({
                                            ...prev,
                                            confirmPassword: '',
                                        }));
                                    }
                                }}
                                placeholder="Re-enter your new password"
                                className={validationErrors.confirmPassword ? 'input-error' : ''}
                            />
                            {validationErrors.confirmPassword && (
                                <p className="field-error" role="alert">
                                    {validationErrors.confirmPassword}
                                </p>
                            )}
                        </div>

                        <button type="submit" className="auth-button">
                            Reset Password
                        </button>
                    </form>
                )}

                {/* Loading Spinner */}
                {status === 'resetting' && (
                    <div className="spinner-container" style={{ textAlign: 'center', padding: '20px' }}>
                        <div className="spinner"></div>
                        <p>Resetting your password...</p>
                    </div>
                )}

                {/* Error state with action */}
                {status === 'error' && (
                    <div className="auth-footer" style={{ marginTop: '20px' }}>
                        <p>
                            <span
                                className="auth-link"
                                onClick={() => navigate('/login')}
                                style={{ cursor: 'pointer' }}
                            >
                                Back to Login
                            </span>
                        </p>
                    </div>
                )}

                {/* Success state with action */}
                {status === 'success' && (
                    <div className="auth-footer" style={{ marginTop: '20px' }}>
                        <p>
                            <span
                                className="auth-link"
                                onClick={() => navigate('/login')}
                                style={{ cursor: 'pointer' }}
                            >
                                Go to Login
                            </span>
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}

export default ResetPassword;
