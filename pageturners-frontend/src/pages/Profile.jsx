// src/pages/Profile.jsx
// UC12: User Profile Management - displays and manages user profile settings
// FR6, FR7, FR8: Profile updates, password changes, picture uploads

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getProfile, updateProfile, changePassword, uploadProfilePicture } from '../api/profile';
import '../styles/Profile.css';

const Profile = () => {
    const navigate = useNavigate();
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);

    // FR6.1: Profile section state
    const [bio, setBio] = useState('');
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [profilePicture, setProfilePicture] = useState('');
    const [previewPicture, setPreviewPicture] = useState('');

    // FR7: Password section state
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');

    // ← ADD THIS: Edit mode state
    const [editMode, setEditMode] = useState({
        bio: false,
        username: false,
        email: false,
        password: false
    });

    // Error/Success states
    const [bioError, setBioError] = useState('');
    const [bioSuccess, setBioSuccess] = useState('');
    const [usernameError, setUsernameError] = useState('');
    const [usernameSuccess, setUsernameSuccess] = useState('');
    const [emailError, setEmailError] = useState('');
    const [emailSuccess, setEmailSuccess] = useState('');
    const [passwordError, setPasswordError] = useState('');
    const [passwordSuccess, setPasswordSuccess] = useState('');
    const [pictureError, setPictureError] = useState('');
    const [pictureSuccess, setPictureSuccess] = useState('');

    // Loading states for buttons
    const [bioLoading, setBioLoading] = useState(false);
    const [usernameLoading, setUsernameLoading] = useState(false);
    const [emailLoading, setEmailLoading] = useState(false);
    const [passwordLoading, setPasswordLoading] = useState(false);
    const [pictureLoading, setPictureLoading] = useState(false);

    useEffect(() => {
        const fetchProfile = async () => {
            const result = await getProfile();
            if (result.success) {
                setProfile(result.data);
                setBio(result.data.bio || '');
                setUsername(result.data.username || '');
                setEmail(result.data.email || '');
                setProfilePicture(result.data.profile_picture || '');
            } else {
                if (result.message.includes('401')) {
                    navigate('/login');
                }
            }
            setLoading(false);
        };
        fetchProfile();
    }, [navigate]);

    // ← ADD THIS: Toggle edit mode
    const toggleEditMode = (field) => {
        setEditMode(prev => ({
            ...prev,
            [field]: !prev[field]
        }));
        // Clear errors when toggling edit mode
        if (field === 'bio') setBioError('');
        if (field === 'username') setUsernameError('');
        if (field === 'email') setEmailError('');
        if (field === 'password') setPasswordError('');
    };

    // FR6.2: Handle bio update
    const handleSaveBio = async () => {
        setBioError('');
        setBioSuccess('');
        setBioLoading(true);

        const result = await updateProfile({ bio });

        if (result.success) {
            setBioSuccess('Bio updated successfully!');
            setEditMode(prev => ({ ...prev, bio: false })); // ← Exit edit mode
            setTimeout(() => setBioSuccess(''), 3000);
        } else {
            setBioError(result.message);
        }
        setBioLoading(false);
    };

    // FR6.2: Handle username update
    const handleSaveUsername = async () => {
        setUsernameError('');
        setUsernameSuccess('');
        setUsernameLoading(true);

        const result = await updateProfile({ username });

        if (result.success) {
            setUsernameSuccess('Username updated successfully!');
            setEditMode(prev => ({ ...prev, username: false })); // ← Exit edit mode
            setTimeout(() => setUsernameSuccess(''), 3000);
        } else {
            if (result.message.includes('already taken')) {
                setUsernameError('Username already taken');
            } else {
                setUsernameError(result.message);
            }
        }
        setUsernameLoading(false);
    };

    // FR6.2: Handle email update
    const handleSaveEmail = async () => {
        setEmailError('');
        setEmailSuccess('');
        setEmailLoading(true);

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            setEmailError('Invalid email format');
            setEmailLoading(false);
            return;
        }

        const result = await updateProfile({ email });

        if (result.success) {
            setEmailSuccess('Verification email sent! Please verify your new email address.');
            setEditMode(prev => ({ ...prev, email: false })); // ← Exit edit mode
            setTimeout(() => setEmailSuccess(''), 5000);
        } else {
            setEmailError(result.message);
        }
        setEmailLoading(false);
    };

    // FR7.3: Handle password change
    const handleChangePassword = async () => {
        setPasswordError('');
        setPasswordSuccess('');
        setPasswordLoading(true);

        if (newPassword.length < 8) {
            setPasswordError('New password must be at least 8 characters');
            setPasswordLoading(false);
            return;
        }

        const result = await changePassword(currentPassword, newPassword);

        if (result.success) {
            setPasswordSuccess('Password changed successfully!');
            setCurrentPassword('');
            setNewPassword('');
            setEditMode(prev => ({ ...prev, password: false })); // ← Exit edit mode
            setTimeout(() => setPasswordSuccess(''), 3000);
        } else {
            setPasswordError(result.message);
        }
        setPasswordLoading(false);
    };

    // FR8: Handle profile picture upload
    const handlePictureUpload = async (e) => {
        setPictureError('');
        setPictureSuccess('');
        const file = e.target.files?.[0];

        if (!file) return;

        const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg'];
        if (!allowedTypes.includes(file.type)) {
            setPictureError('Only JPG/PNG/JPEG files allowed');
            return;
        }

        setPictureLoading(true);

        const reader = new FileReader();
        reader.onload = async (event) => {
            const base64String = event.target?.result;
            setPreviewPicture(base64String || '');

            const result = await uploadProfilePicture(base64String);

            if (result.success) {
                setProfilePicture(result.data.profile_picture);
                setPreviewPicture('');
                setPictureSuccess('Profile picture updated successfully!');
                setTimeout(() => setPictureSuccess(''), 3000);
            } else {
                setPictureError(result.message);
                setPreviewPicture('');
            }
            setPictureLoading(false);
        };

        reader.readAsDataURL(file);
    };

    if (loading) return <div className="profile-loading">Loading profile...</div>;
    if (!profile) return <div className="profile-error">Failed to load profile</div>;

    return (
        <div className="profile-page">
            {/* Header */}
            <header className="dashboard-header">
                <div className="header-logo">
                    <span className="logo-icon">📚</span>
                    <span className="logo-text">PageTurners</span>
                </div>
                <nav className="header-nav">
                    <button className="nav-btn" onClick={() => navigate('/dashboard')}>Dashboard</button>
                    <button className="nav-btn" onClick={() => navigate('/library')}>My Library</button>
                    <button className="nav-btn logout-btn" onClick={() => {
                        localStorage.removeItem('token');
                        navigate('/login');
                    }}>
                        Logout
                    </button>
                </nav>
            </header>

            <div className="profile-container">
                <div className="settings-sidebar">
                    <h3>Settings</h3>
                    <button className="sidebar-btn" onClick={() => document.getElementById('profile-section')?.scrollIntoView({ behavior: 'smooth' })}>
                        Profile
                    </button>
                    <button className="sidebar-btn" onClick={() => document.getElementById('account-section')?.scrollIntoView({ behavior: 'smooth' })}>
                        Account
                    </button>
                    <button className="sidebar-btn" onClick={() => document.getElementById('password-section')?.scrollIntoView({ behavior: 'smooth' })}>
                        Password
                    </button>
                </div>

                <div className="profile-content">
                    {/* PROFILE SECTION */}
                    <div id="profile-section" className="profile-section">
                        <h2>Profile</h2>

                        {/* FR8: Profile Picture */}
                        <div className="form-group picture-group">
                            <label>Profile Picture</label>
                            <div className="picture-container">
                                {previewPicture || profilePicture ? (
                                    <img src={previewPicture || profilePicture} alt="Profile" className="profile-pic-preview" />
                                ) : (
                                    <div className="profile-pic-placeholder">👤</div>
                                )}
                                <label className="upload-btn">
                                    Upload new profile picture
                                    <input type="file" hidden accept="image/jpeg,image/png,image/jpg" onChange={handlePictureUpload} disabled={pictureLoading} />
                                </label>
                            </div>
                            {pictureError && <div className="error-message">{pictureError}</div>}
                            {pictureSuccess && <div className="success-message">{pictureSuccess}</div>}
                        </div>

                        {/* FR6.1: Bio - WITH EDIT MODE */}
                        <div className="form-group">
                            <div className="field-header">
                                <label>Bio</label>
                                <button 
                                    className="edit-icon-btn"
                                    onClick={() => toggleEditMode('bio')}
                                    title={editMode.bio ? 'Cancel' : 'Edit'}
                                >
                                    {editMode.bio ? '✕' : '✎'}
                                </button>
                            </div>
                            {editMode.bio ? (
                                <>
                                    <textarea
                                        value={bio}
                                        onChange={(e) => setBio(e.target.value)}
                                        placeholder="Tell us about yourself"
                                        className="profile-textarea"
                                    />
                                    <button onClick={handleSaveBio} disabled={bioLoading} className="save-btn">
                                        {bioLoading ? 'Saving...' : 'Save'}
                                    </button>
                                </>
                            ) : (
                                <div className="view-only-text">{bio || 'No bio yet'}</div>
                            )}
                            {bioError && <div className="error-message">{bioError}</div>}
                            {bioSuccess && <div className="success-message">{bioSuccess}</div>}
                        </div>

                        {/* FR6.1: Username - WITH EDIT MODE */}
                        <div className="form-group">
                            <div className="field-header">
                                <label>Username</label>
                                <button 
                                    className="edit-icon-btn"
                                    onClick={() => toggleEditMode('username')}
                                    title={editMode.username ? 'Cancel' : 'Edit'}
                                >
                                    {editMode.username ? '✕' : '✎'}
                                </button>
                            </div>
                            {editMode.username ? (
                                <>
                                    <input
                                        type="text"
                                        value={username}
                                        onChange={(e) => setUsername(e.target.value)}
                                        placeholder="Your username"
                                        className="profile-input"
                                    />
                                    <button onClick={handleSaveUsername} disabled={usernameLoading} className="save-btn">
                                        {usernameLoading ? 'Saving...' : 'Save'}
                                    </button>
                                </>
                            ) : (
                                <div className="view-only-text">{username}</div>
                            )}
                            {usernameError && <div className="error-message">{usernameError}</div>}
                            {usernameSuccess && <div className="success-message">{usernameSuccess}</div>}
                        </div>
                    </div>

                    {/* ACCOUNT SECTION */}
                    <div id="account-section" className="account-section">
                        <h2>Account</h2>

                        {/* FR6.1: Email - WITH EDIT MODE */}
                        <div className="form-group">
                            <div className="field-header">
                                <label>Email Address</label>
                                <button 
                                    className="edit-icon-btn"
                                    onClick={() => toggleEditMode('email')}
                                    title={editMode.email ? 'Cancel' : 'Edit'}
                                >
                                    {editMode.email ? '✕' : '✎'}
                                </button>
                            </div>
                            {editMode.email ? (
                                <>
                                    <input
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        placeholder="your@email.com"
                                        className="profile-input"
                                    />
                                    <button onClick={handleSaveEmail} disabled={emailLoading} className="save-btn">
                                        {emailLoading ? 'Saving...' : 'Save'}
                                    </button>
                                </>
                            ) : (
                                <div className="view-only-text">{email}</div>
                            )}
                            {emailError && <div className="error-message">{emailError}</div>}
                            {emailSuccess && <div className="success-message">{emailSuccess}</div>}
                        </div>
                    </div>

                    {/* PASSWORD SECTION */}
                    <div id="password-section" className="password-section">
                        <h2>Password</h2>

                        {/* FR7: Password Change - WITH EDIT MODE */}
                        {editMode.password ? (
                            <>
                                <div className="form-group">
                                    <label>Current Password</label>
                                    <input
                                        type="password"
                                        value={currentPassword}
                                        onChange={(e) => setCurrentPassword(e.target.value)}
                                        placeholder="Enter current password"
                                        className="profile-input"
                                    />
                                </div>

                                <div className="form-group">
                                    <label>New Password</label>
                                    <input
                                        type="password"
                                        value={newPassword}
                                        onChange={(e) => setNewPassword(e.target.value)}
                                        placeholder="minimum 8 characters"
                                        className="profile-input"
                                    />
                                </div>

                                <button onClick={handleChangePassword} disabled={passwordLoading} className="save-btn">
                                    {passwordLoading ? 'Updating...' : 'Update Password'}
                                </button>
                                <button 
                                    onClick={() => toggleEditMode('password')}
                                    className="cancel-btn"
                                >
                                    Cancel
                                </button>
                            </>
                        ) : (
                            <button 
                                className="edit-btn"
                                onClick={() => toggleEditMode('password')}
                            >
                                ✎ Change Password
                            </button>
                        )}
                        {passwordError && <div className="error-message">{passwordError}</div>}
                        {passwordSuccess && <div className="success-message">{passwordSuccess}</div>}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Profile;