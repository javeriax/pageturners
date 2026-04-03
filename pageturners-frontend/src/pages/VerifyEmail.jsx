import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { verifyEmail } from '../api/auth';
import '../styles/Auth.css';

function VerifyEmail() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const [status, setStatus] = useState('loading');
    const [message, setMessage] = useState('Verifying your email...');

    useEffect(() => {
        const verify = async () => {
            try {
                const email = searchParams.get('email');
                const code = searchParams.get('code');

                if (!email || !code) {
                    setStatus('error');
                    setMessage('Invalid verification link');
                    return;
                }

                // Call backend to verify email
                const response = await verifyEmail(email, code);

                if (response.success) {
                    setStatus('success');
                    setMessage('Email verified successfully! Redirecting to login...');

                    // TODO: (Login Team): Change navigate('/') to navigate('/login') below when login page is ready
                    // This will direct verified users to the login page you create.
                    // Also in App.jsx, uncomment the line specified there.
                    setTimeout(() => {
                        navigate('/');
                    }, 3000);
                } else {
                    setStatus('error');
                    setMessage(response.message || 'Verification failed');
                }
            } catch (error) {
                setStatus('error');
                setMessage('An error occurred during verification');
                console.error('Verification error:', error);
            }
        };

        verify();
    }, [searchParams, navigate]);

    return (
        <div className="auth-container">
            <div className="auth-box">
                <div className="book-icon">📖</div>
                <h1>PageTurners</h1>

                <div
                    className={`verification-message ${status}`}
                    style={{
                        padding: '20px',
                        borderRadius: '5px',
                        marginBottom: '20px',
                        textAlign: 'center',
                        backgroundColor:
                            status === 'success'
                                ? '#d4edda'
                                : status === 'error'
                                    ? '#f8d7da'
                                    : '#e7f3ff',
                        color:
                            status === 'success'
                                ? '#155724'
                                : status === 'error'
                                    ? '#721c24'
                                    : '#004085',
                        border:
                            status === 'success'
                                ? '1px solid #c3e6cb'
                                : status === 'error'
                                    ? '1px solid #f5c6cb'
                                    : '1px solid #b8daff',
                    }}
                >
                    <p style={{ fontSize: '16px', margin: '0' }}>{message}</p>
                    {status === 'loading' && <div className="spinner" style={{ marginTop: '10px' }} />}
                </div>

                {status === 'error' && (
                    <button
                        onClick={() => navigate('/')}
                        style={{
                            marginTop: '20px',
                            padding: '10px 20px',
                            backgroundColor: '#8B6F47',
                            color: 'white',
                            border: 'none',
                            borderRadius: '5px',
                            cursor: 'pointer',
                            fontSize: '16px',
                        }}
                    >
                        Back to Registration
                    </button>
                )}
            </div>

            <style>{`
        .spinner {
          border: 3px solid rgba(0, 0, 0, 0.1);
          border-radius: 50%;
          border-top-color: #004085;
          width: 30px;
          height: 30px;
          animation: spin 1s linear infinite;
          margin: 0 auto;
        }

        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
        </div>
    );
}

export default VerifyEmail;
