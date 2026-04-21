import { useState } from 'react';
import { forgotPassword, resetPassword } from '../api/auth';
import '../styles/ForgotPasswordModal.css';

/**
 * ForgotPasswordModal: Reusable modal component for password reset flow
 * 
 * Props:
 * - isOpen: boolean - Controls whether modal is visible
 * - onClose: function - Called when user closes the modal
 * 
 * Flow:
 * 1. User enters email to request password reset
 * 2. Backend sends reset code via email
 * 3. User enters reset code and new password
 * 4. Password is updated and user is returned to login
 */
export default function ForgotPasswordModal({ isOpen, onClose }) {
    // Step tracking: 'request' -> 'reset'
    const [step, setStep] = useState('request');

    // Form state for email request
    const [email, setEmail] = useState('');

    // Form state for password reset
    const [resetCode, setResetCode] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    // Loading and error states
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    // Validation errors
    const [validationErrors, setValidationErrors] = useState({});

    /**
     * Validate email format
     */
    const validateEmail = (emailToValidate) => {
        if (!emailToValidate.trim()) return 'Email is required';
        if (!emailToValidate.includes('@')) return 'Email must include the @ symbol';
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailToValidate)) {
            return 'Please enter a valid email address';
        }
        return '';
    };

    /**
     * Validate reset password form
     */
    const validateResetForm = () => {
        const errors = {};

        if (!resetCode.trim()) {
            errors.resetCode = 'Reset code is required';
        } else if (resetCode.length !== 6) {
            errors.resetCode = 'Reset code must be 6 characters';
        }

        if (!newPassword) {
            errors.newPassword = 'New password is required';
        } else if (newPassword.length < 8) {
            errors.newPassword = 'Password must be at least 8 characters long';
        }

        if (!confirmPassword) {
            errors.confirmPassword = 'Please confirm your password';
        } else if (newPassword !== confirmPassword) {
            errors.confirmPassword = 'Passwords do not match';
        }

        return errors;
    };

    /**
     * Handle request password reset (send reset email)
     */
    const handleRequestReset = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        const emailError = validateEmail(email);
        if (emailError) {
            setValidationErrors({ email: emailError });
            return;
        }

        setLoading(true);
        try {
            const result = await forgotPassword(email);

            if (result.success) {
                setSuccess('Password reset code sent! Check your email for the reset code.');
                setValidationErrors({});
                // Move to reset password step after a short delay
                setTimeout(() => {
                    setStep('reset');
                }, 1500);
            } else {
                setError(result.message || 'Failed to send password reset email');
            }
        } catch (err) {
            setError(err.message || 'An error occurred');
        } finally {
            setLoading(false);
        }
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
                setSuccess('Password reset successfully! You will be redirected to login.');
                setValidationErrors({});
                // Close modal after success
                setTimeout(() => {
                    handleClose();
                }, 2000);
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
     * Handle modal close - reset all state
     */
    const handleClose = () => {
        setStep('request');
        setEmail('');
        setResetCode('');
        setNewPassword('');
        setConfirmPassword('');
        setError('');
        setSuccess('');
        setValidationErrors({});
        onClose();
    };

    /**
     * Handle going back to email request step
     */
    const handleBackToRequest = () => {
        setStep('request');
        setResetCode('');
        setNewPassword('');
        setConfirmPassword('');
        setError('');
        setSuccess('');
        setValidationErrors({});
    };

    if (!isOpen) return null;

    return (
        <div className="forgot-password-modal-overlay" onClick={handleClose}>
            <div className="forgot-password-modal" onClick={(e) => e.stopPropagation()}>
                {/* Close button */}
                <button
                    className="forgot-password-modal-close"
                    onClick={handleClose}
                    aria-label="Close modal"
                >
                    ✕
                </button>

                {step === 'request' ? (
                    <>
                        {/* Request Password Reset Form */}
                        <div className="forgot-password-header">
                            <h2>Reset Your Password</h2>
                            <p>Enter your email address and we'll send you a password reset code.</p>
                        </div>

                        {/* Error Message */}
                        {error && (
                            <div className="message error-message" role="alert">
                                <span className="message-icon">✕</span>
                                <p>{error}</p>
                            </div>
                        )}

                        {/* Success Message */}
                        {success && (
                            <div className="message success-message" role="alert">
                                <span className="message-icon">✓</span>
                                <p>{success}</p>
                            </div>
                        )}

                        <form onSubmit={handleRequestReset} className="forgot-password-form">
                            {/* Email Field */}
                            <div className="form-group">
                                <label htmlFor="forgot-email">Email Address</label>
                                <input
                                    type="email"
                                    id="forgot-email"
                                    value={email}
                                    onChange={(e) => {
                                        setEmail(e.target.value);
                                        if (validationErrors.email) {
                                            setValidationErrors((prev) => ({
                                                ...prev,
                                                email: '',
                                            }));
                                        }
                                    }}
                                    placeholder="name@example.com"
                                    disabled={loading}
                                    className={validationErrors.email ? 'input-error' : ''}
                                    data-testid="forgot-email-input"
                                />
                                {validationErrors.email && (
                                    <p className="field-error" role="alert">
                                        {validationErrors.email}
                                    </p>
                                )}
                            </div>

                            {/* Submit Button */}
                            <button
                                type="submit"
                                className="forgot-password-button"
                                disabled={loading}
                                data-testid="forgot-password-submit-btn"
                            >
                                {loading ? 'Sending...' : 'Send Reset Code'}
                            </button>
                        </form>
                    </>
                ) : (
                    <>
                        {/* Reset Password Form */}
                        <div className="forgot-password-header">
                            <h2>Enter Reset Code</h2>
                            <p>Check your email for the reset code and enter it below along with your new password.</p>
                        </div>

                        {/* Error Message */}
                        {error && (
                            <div className="message error-message" role="alert">
                                <span className="message-icon">✕</span>
                                <p>{error}</p>
                            </div>
                        )}

                        {/* Success Message */}
                        {success && (
                            <div className="message success-message" role="alert">
                                <span className="message-icon">✓</span>
                                <p>{success}</p>
                            </div>
                        )}

                        <form onSubmit={handleResetPassword} className="forgot-password-form">
                            {/* Reset Code Field */}
                            <div className="form-group">
                                <label htmlFor="reset-code">Reset Code</label>
                                <input
                                    type="text"
                                    id="reset-code"
                                    value={resetCode}
                                    onChange={(e) => {
                                        setResetCode(e.target.value.toUpperCase());
                                        if (validationErrors.resetCode) {
                                            setValidationErrors((prev) => ({
                                                ...prev,
                                                resetCode: '',
                                            }));
                                        }
                                    }}
                                    placeholder="6-character code from email"
                                    disabled={loading}
                                    maxLength="6"
                                    className={validationErrors.resetCode ? 'input-error' : ''}
                                    data-testid="reset-code-input"
                                />
                                {validationErrors.resetCode && (
                                    <p className="field-error" role="alert">
                                        {validationErrors.resetCode}
                                    </p>
                                )}
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
                                    placeholder="At least 8 characters"
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
                                    placeholder="Re-enter your password"
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
                                className="forgot-password-button"
                                disabled={loading}
                                data-testid="reset-password-submit-btn"
                            >
                                {loading ? 'Resetting...' : 'Reset Password'}
                            </button>
                        </form>

                        {/* Back Button */}
                        <button
                            type="button"
                            className="forgot-password-back-button"
                            onClick={handleBackToRequest}
                            disabled={loading}
                        >
                            ← Back to Email
                        </button>
                    </>
                )}
            </div>
        </div>
    );
}
