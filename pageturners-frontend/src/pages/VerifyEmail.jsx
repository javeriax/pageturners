import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, useLocation } from 'react-router-dom';
import { verifyEmail } from '../api/auth';
import '../styles/Auth.css';

function VerifyEmail() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const location = useLocation();

    // The status can be: 'idle', 'verifying', 'success', or 'error'
    const [status, setStatus] = useState('idle');
    const [message, setMessage] = useState('');

    // Pre-fill email from URL OR from the Register page handover
    const [manualEmail] = useState(
        searchParams.get('email') || location.state?.email || ''
    );
    const [manualCode, setManualCode] = useState('');

    useEffect(() => {
        const email = searchParams.get('email');
        const code = searchParams.get('code');

        // IF BOTH EXIST: It's a link click. Trigger auto-verify immediately.
        if (email && code) {
            handleVerify(email, code);
        } else {
            // IF NOT: Just wait for manual input
            setStatus('idle');
            setMessage('Please enter the code sent to your email to verify your account.');
        }
    }, [searchParams]);

    const handleVerify = async (email, code) => {
        setStatus('verifying');
        setMessage('Verifying your account... please wait.');

        try {
            const response = await verifyEmail(email, code);

            if (response.success) {
                setStatus('success');
                setMessage('Verification successful! Redirecting...');

                // Redirect to Register (the "/" path) after a short delay
                setTimeout(() => {
                    navigate('/login'); // Change to '/login' page
                }, 1500);
            } else {
                setStatus('error');
                setMessage(response.message || 'Verification failed. Please try again.');
            }
        } catch (error) {
            setStatus('error');
            setMessage('Server error. Please check your connection.');
        }
    };

    const handleManualSubmit = (e) => {
        e.preventDefault();
        handleVerify(manualEmail, manualCode);
    };

    return (
        <div className="auth-container">
            <div className="auth-card">
                <div className="logo-section">
                    <div className="logo-icon">📖</div>
                    <h1>PageTurners</h1>
                </div>

                <h2>Email Verification</h2>

                {/* Status Message */}
                {message && (
                    <div className={`message ${status === 'verifying' ? 'info' : status}-message`} style={{ marginBottom: '20px' }}>
                        <p>{message}</p>
                    </div>
                )}

                {/* Only show the form if we are NOT successfully verified 
                  and NOT currently in the middle of an auto-verification 
                */}
                {status !== 'success' && status !== 'verifying' && (
                    <form onSubmit={handleManualSubmit} className="auth-form">
                        <div className="form-group">
                            <label>Email Address</label>
                            <input
                                type="email"
                                value={manualEmail}
                                readOnly
                                style={{ backgroundColor: '#f5f5f5', color: '#666', cursor: 'not-allowed' }}
                            />
                        </div>
                        <div className="form-group">
                            <label>Verification Code</label>
                            <input
                                type="text"
                                value={manualCode}
                                onChange={(e) => setManualCode(e.target.value.toUpperCase())}
                                placeholder="6-digit code"
                                required
                                maxLength="6"
                            />
                        </div>
                        <button type="submit" className="auth-button">
                            Verify Account
                        </button>
                    </form>
                )}

                {/* Loading Spinner for the Link Clickers */}
                {status === 'verifying' && (
                    <div className="spinner-container" style={{ textAlign: 'center', padding: '20px' }}>
                        <div className="spinner"></div>
                        <p>Checking your link...</p>
                    </div>
                )}

                <div className="auth-footer" style={{ marginTop: '20px' }}>
                    <p>
                        Need to change your email?{' '}
                        <span className="auth-link" onClick={() => navigate('/')} style={{ cursor: 'pointer' }}>
                            Back to Register
                        </span>
                    </p>
                </div>
            </div>
        </div>
    );
}

export default VerifyEmail;