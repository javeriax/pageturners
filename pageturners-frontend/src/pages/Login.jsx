import React, { useState, useEffect, useRef } from 'react';
import { loginUser } from '../api/auth';
import { useSearchParams } from 'react-router-dom';
import ForgotPasswordModal from '../components/ForgotPasswordModal';
import ResetPasswordModal from '../components/ResetPasswordModal';
import '../styles/Auth.css';

// login component:
//form with email and password fields:
export default function Login() {
    const [searchParams] = useSearchParams();

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const [forgotPasswordModalOpen, setForgotPasswordModalOpen] = useState(false);
    const [resetPasswordModalOpen, setResetPasswordModalOpen] = useState(false);

    const [resetEmail, setResetEmail] = useState('');
    const [resetCode, setResetCode] = useState('');

    const [formData, setFormData] = useState({
        email: '',
        password: '',
    });

    const [validationErrors, setValidationErrors] = useState({});
    const isSubmitting = useRef(false);

    // check for reset password params in URL:
    useEffect(() => {
        const email = searchParams.get('email');
        const code = searchParams.get('code');
        // if both email and code are present, open reset password modal with pre-filled email and code:
        if (email && code) {
            setResetEmail(email);
            setResetCode(code);
            setResetPasswordModalOpen(true);
        }
    }, [searchParams]);

    // validate form:
    const validateForm = () => {
        const errors = {};

        if (!formData.email.trim()) {
            errors.email = 'Email is required';
        } else if (!formData.email.includes('@')) {
            errors.email = 'Email must include the @ symbol (e.g., name@example.com)';
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
            errors.email = 'Please enter a valid email address with domain (e.g., name@example.com)';
        }

        if (!formData.password) {
            errors.password = 'Password is required';
        }

        return errors;
    };

    //handle input change and clear validation error for the field:
    const handleChange = (e) => {
        const { name, value } = e.target;

        setFormData(prev => ({
            ...prev,
            [name]: value,
        }));

        if (validationErrors[name]) {
            setValidationErrors(prev => ({
                ...prev,
                [name]: '',
            }));
        }
    };

    //handle submit:
    const handleSubmit = async (e) => {
        e.preventDefault();

        if (isSubmitting.current) return;
        isSubmitting.current = true;

        setError('');
        // validate form and if there are errors, set validation errors state and stop submission:
        const errors = validateForm();
        if (Object.keys(errors).length > 0) {
            setValidationErrors(errors);
            isSubmitting.current = false;
            return;
        }

        setLoading(true);
        // call login API and handle response:
        try {
            const result = await loginUser(formData.email, formData.password);

            if (result.success) {
                localStorage.setItem('token', result.token);
                window.location.href = '/dashboard';
            } else {
                setError(result.message);
            }
        } catch (err) {
            setError(err.message || 'An unexpected error occurred');
        } finally {
            isSubmitting.current = false;
            setLoading(false);
        }
    };
    //form with error messages and modals:
    return (
        <div className="auth-container">
            <div className="auth-card">

                {/* logo */}
                <div className="logo-section">
                    <div className="logo-icon">⚔️</div>
                    <h1>PageTurners</h1>
                </div>

                {/* error */}
                {error && (
                    <div className="message error-message" role="alert">
                        <span className="message-icon">✕</span>
                        <p>{error}</p>
                    </div>
                )}

                <form onSubmit={handleSubmit} className="auth-form">

                    {/* email */}
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
                        />
                        {validationErrors.email && (
                            <p className="field-error">{validationErrors.email}</p>
                        )}
                    </div>

                    {/* password */}
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
                        />
                        {validationErrors.password && (
                            <p className="field-error">{validationErrors.password}</p>
                        )}
                    </div>

                    {/* submit */}
                    <button
                        type="submit"
                        className="auth-button"
                        disabled={loading}
                    >
                        {loading ? 'Logging in...' : 'Login'}
                    </button>
                </form>

                {/* footer */}
                <p className="auth-footer">
                    <button
                        type="button"
                        className="auth-link"
                        onClick={() => setForgotPasswordModalOpen(true)}
                    >
                        Forgot Password?
                    </button>
                    {' • '}
                    <a href="/register" className="auth-link">
                        Sign Up
                    </a>
                </p>

                {/* modals */}
                <ForgotPasswordModal
                    isOpen={forgotPasswordModalOpen}
                    onClose={() => setForgotPasswordModalOpen(false)}
                />

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