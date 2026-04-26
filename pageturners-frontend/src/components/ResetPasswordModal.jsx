import { useState, useEffect } from 'react';
import { resetPassword } from '../api/auth';
import '../styles/ForgotPasswordModal.css';

/**
 * ResetPasswordModal: Modal component for password reset via email link
 * 
 * Props:
 * - isOpen: boolean - Controls whether modal is visible
 * - onClose: function - Called when user closes the modal
 * - email: string - Pre-filled email from URL
 * - resetCode: string - Pre-filled reset code from URL
 * 
 * Flow:
 * 1. Modal opens automatically when user clicks email reset link
 * 2. Email and reset code are pre-filled and read-only
 * 3. User enters new password
 * 4. Password is updated via API
 * 5. Modal closes and user is returned to login
 */
export default function ResetPasswordModal({ isOpen, onClose, email, resetCode }) {
    // Form state for password reset
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    // Loading and error states
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    // Validation errors
    const [validationErrors, setValidationErrors] = useState({});

    // Close modal when success message is shown (auto-close after delay)
    useEffect(() => {
        if (success) {
            setTimeout(() => {
                handleClose();
            }, 2000);
        }
    }, [success]);

    /**
     * Validate reset password form
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

    /**
     * Handle password reset (submit new password)
     */
    const handleResetPassword = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        const errors = validateResetForm();
        if (Object.keys(errors).length > 0) {
            setValidationErrors(errors);
            return;
        }

        setLoading(true);
        try {
            const result = await resetPassword(email, resetCode, newPassword);

            if (result.success) {
                setSuccess('Password reset successfully! You can now log in with your new password.');
                setValidationErrors({});
                // Clear form
                setNewPassword('');
                setConfirmPassword('');
            } else {
                setError(result.message || 'Failed to reset password');
            }
        } catch (err) {
            setError(err.message || 'An error occurred');
        } finally {
            setLoading(false);
        }
    };

    /**
     * Handle close modal
     */
    const handleClose = () => {
        // Reset form state
        setNewPassword('');
        setConfirmPassword('');
        setError('');
        setSuccess('');
        setValidationErrors({});
        // Close modal
        onClose();
    };

    if (!isOpen) {
        return null;
    }

    return (
        <div className="modal-overlay" onClick={handleClose}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <button
                    type="button"
                    className="modal-close-btn"
                    onClick={handleClose}
                    aria-label="Close modal"
                >
                    ✕
                </button>

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

                {/* Error Message */}
                {error && (
                    <div className="message error-message" role="alert" style={{ marginBottom: '15px' }}>
                        <span className="message-icon">✕</span>
                        <p>{error}</p>
                    </div>
                )}

                {/* Success Message */}
                {success && (
                    <div className="message success-message" role="alert" style={{ marginBottom: '15px' }}>
                        <span className="message-icon">✓</span>
                        <p>{success}</p>
                    </div>
                )}

                <form onSubmit={handleResetPassword} className="forgot-password-form">
                    {/* Email Field (Read-only) */}
                    <div className="form-group">
                        <label htmlFor="reset-email">Email Address</label>
                        <input
                            type="email"
                            id="reset-email"
                            value={email}
                            readOnly
                            style={{ backgroundColor: '#f5f5f5', color: '#666', cursor: 'not-allowed' }}
                        />
                    </div>

                    {/* Reset Code Field (Read-only) */}
                    <div className="form-group">
                        <label htmlFor="reset-code-field">Reset Code</label>
                        <input
                            type="text"
                            id="reset-code-field"
                            value={resetCode}
                            readOnly
                            style={{ backgroundColor: '#f5f5f5', color: '#666', cursor: 'not-allowed' }}
                        />
                    </div>

                    {/* New Password Field */}
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
                            disabled={loading}
                            className={validationErrors.newPassword ? 'input-error' : ''}
                            data-testid="new-password-input"
                        />
                        {validationErrors.newPassword && (
                            <p className="field-error" role="alert">
                                {validationErrors.newPassword}
                            </p>
                        )}
                    </div>

                    {/* Confirm Password Field */}
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

                    {/* Submit Button */}
                    <button
                        type="submit"
                        className="auth-button"
                        disabled={loading}
                        data-testid="reset-password-submit-btn"
                    >
                        {loading ? 'Resetting Password...' : 'Reset Password'}
                    </button>
                </form>
            </div>
        </div>
    );
}
