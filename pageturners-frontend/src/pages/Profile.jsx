// src/pages/Profile.jsx
// UC12: User Profile Management - displays and manages user profile settings
// FR6, FR7, FR8: Profile updates, password changes, picture uploads

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getProfile, updateProfile, changePassword, uploadProfilePicture } from '../api/profile';
import '../styles/Profile.css';

//  CONSTANTS 

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/jpg'];
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

//  SUB-COMPONENTS 

const FieldFeedback = ({ error, success }) => (
    <>
        {error && <div className="error-message">{error}</div>}
        {success && <div className="success-message">{success}</div>}
    </>
);

const EditToggleButton = ({ isEditing, onToggle }) => (
    <button className="edit-icon-btn" onClick={onToggle} title={isEditing ? 'Cancel' : 'Edit'}>
        {isEditing ? '✕' : '✎'}
    </button>
);

const SaveButton = ({ loading, onClick, label = 'Save' }) => (
    <button onClick={onClick} disabled={loading} className="save-btn">
        {loading ? 'Saving...' : label}
    </button>
);

//  HOOK 

const useFieldState = () => {
    const [error, setErrorState] = useState('');
    const [success, setSuccessState] = useState('');
    const [loading, setLoading] = useState(false);

    const reset = () => { setErrorState(''); setSuccessState(''); };
    const setError = (msg) => { setErrorState(msg); setLoading(false); };
    const setSuccess = (msg, delay = 3000) => {
        setSuccessState(msg);
        setLoading(false);
        if (delay) setTimeout(() => setSuccessState(''), delay);
    };

    return { error, success, loading, setLoading, setError, setSuccess, reset };
};

//  MAIN COMPONENT 

const Profile = () => {
    const navigate = useNavigate();
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [editMode, setEditMode] = useState({ bio: false, username: false, email: false, password: false });

    const [bio, setBio] = useState('');
    const [bioCharCount, setBioCharCount] = useState(0);
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [profilePicture, setProfilePicture] = useState('');
    const [previewPicture, setPreviewPicture] = useState('');
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');

    const bio$ = useFieldState();
    const username$ = useFieldState();
    const email$ = useFieldState();
    const password$ = useFieldState();
    const picture$ = useFieldState();

    //  HELPERS 

    const toggleEditMode = (field) => {
        setEditMode(prev => ({ ...prev, [field]: !prev[field] }));
        ({ bio: bio$, username: username$, email: email$, password: password$ })[field]?.reset();
    };

    const exitEditMode = (field) => setEditMode(prev => ({ ...prev, [field]: false }));

    const scrollTo = (id) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });

    const handleLogout = async () => {
        try {
            await fetch(`${API_BASE}/auth/logout`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            });
        } catch (e) {
            // still logout on frontend even if backend call fails
        }
        localStorage.removeItem('token');
        navigate('/login');
    };

    //  LOAD PROFILE 

    useEffect(() => {
        const fetchProfile = async () => {
            const result = await getProfile();
            if (result.success) {
                const { bio: b = '', username: u = '', email: em = '', profile_picture: pp = '' } = result.data;
                setProfile(result.data);
                setBio(b);
                setBioCharCount(b.length);
                setUsername(u);
                setEmail(em);
                setProfilePicture(pp);
            } else {
                if (result.message.includes('401')) navigate('/login');
            }
            setLoading(false);
        };
        fetchProfile();
    }, [navigate]);

    //  SAVE HANDLERS 

    const handleSaveBio = async () => {
        bio$.reset();
        bio$.setLoading(true);
        if (bio.length > 150) return bio$.setError('Please make sure your bio doesnt exceed 150 characters please:)');
        const result = await updateProfile({ bio });
        if (result.success) { bio$.setSuccess('Bio updated successfully!'); exitEditMode('bio'); }
        else bio$.setError(result.message);
    };

    const handleSaveUsername = async () => {
        username$.reset();
        username$.setLoading(true);
        if (!username.trim())                   return username$.setError('Username cannot be empty');
        if (username.length < 3)                return username$.setError('Username must be at least 3 characters 🥲');
        if (username.length > 20)               return username$.setError('oops!! you cannot exceed 20 characters 😢');
        if (!/^[a-zA-Z0-9_]+$/.test(username)) return username$.setError('Username can only contain letters, numbers, and underscores 🥹');
        const result = await updateProfile({ username });
        if (result.success) { username$.setSuccess('Username updated successfully!'); exitEditMode('username'); }
        else username$.setError(result.message.includes('already taken') ? 'Username already taken' : result.message);
    };

    const handleSaveEmail = async () => {
        email$.reset();
        email$.setLoading(true);
        if (!EMAIL_REGEX.test(email)) return email$.setError('Invalid email format');
        const result = await updateProfile({ email });
        if (result.success) { email$.setSuccess('Verification email sent to your new address! Please verify it to complete the change.', 5000); exitEditMode('email'); }
        else email$.setError(result.message);
    };

    const handleChangePassword = async () => {
        password$.reset();
        password$.setLoading(true);
        if (newPassword.length < 8)                return password$.setError('New password must be at least 8 characters');
        if (!/(?=.*[a-z])/.test(newPassword))      return password$.setError('Password must contain at least one lowercase letter');
        if (!/(?=.*[A-Z])/.test(newPassword))      return password$.setError('Password must contain at least one uppercase letter');
        if (!/(?=.*\d)/.test(newPassword))         return password$.setError('Password must contain at least one number');
        const result = await changePassword(currentPassword, newPassword);
        if (result.success) {
            password$.setSuccess('Password changed successfully!');
            setCurrentPassword(''); setNewPassword('');
            exitEditMode('password');
        } else password$.setError(result.message);
    };

    const handlePictureUpload = async (e) => {
        picture$.reset();
        const file = e.target.files?.[0];
        if (!file) return;
        if (!ALLOWED_IMAGE_TYPES.includes(file.type)) return picture$.setError('Only JPG/PNG/JPEG files allowed');
        picture$.setLoading(true);
        const reader = new FileReader();
        reader.onload = async (event) => {
            const base64String = event.target?.result;
            setPreviewPicture(base64String || '');
            const result = await uploadProfilePicture(base64String);
            if (result.success) {
                setProfilePicture(result.data.profile_picture);
                setPreviewPicture('');
                picture$.setSuccess('Profile picture updated successfully!');
            } else {
                picture$.setError(result.message);
                setPreviewPicture('');
            }
        };
        reader.readAsDataURL(file);
    };

    //  RENDER 

    if (loading) return <div className="profile-loading">Loading profile...</div>;
    if (!profile) return <div className="profile-error">Failed to load profile</div>;

    return (
        <div className="profile-page">
            <header className="dashboard-header">
                <div className="header-logo">
                    <span className="logo-icon">⚔️</span>
                    <span className="logo-text">PageTurners</span>
                </div>
                <nav className="header-nav">
                    <button className="nav-btn" onClick={() => navigate('/dashboard')}>Dashboard</button>
                    <button className="nav-btn" onClick={() => navigate('/library')}>My Library</button>
                    <button className="nav-btn logout-btn" onClick={handleLogout}>Logout</button>
                </nav>
            </header>

            <div className="profile-container">
                <div className="settings-sidebar">
                    <h3>Settings</h3>
                    <button className="sidebar-btn" onClick={() => scrollTo('profile-section')}>Profile</button>
                    <button className="sidebar-btn" onClick={() => scrollTo('account-section')}>Account</button>
                    <button className="sidebar-btn" onClick={() => scrollTo('password-section')}>Password</button>
                </div>

                <div className="profile-content">

                    {/*  PROFILE SECTION  */}
                    <div id="profile-section" className="profile-section">
                        <h2>Profile</h2>

                        {/* FR8: Profile Picture */}
                        <div className="form-group picture-group">
                            <label>Profile Picture</label>
                            <div className="picture-container">
                                {previewPicture || profilePicture
                                    ? <img src={previewPicture || profilePicture} alt="Profile" className="profile-pic-preview" />
                                    : <div className="profile-pic-placeholder">👤</div>
                                }
                                <label className="upload-btn">
                                    Upload new profile picture
                                    <input type="file" hidden accept="image/jpeg,image/png,image/jpg" onChange={handlePictureUpload} disabled={picture$.loading} />
                                </label>
                            </div>
                            <FieldFeedback error={picture$.error} success={picture$.success} />
                        </div>

                        {/* FR6.1: Bio */}
                        <div className="form-group">
                            <div className="field-header">
                                <label>Bio</label>
                                <EditToggleButton isEditing={editMode.bio} onToggle={() => toggleEditMode('bio')} />
                            </div>
                            {editMode.bio ? (
                                <>
                                    <textarea
                                        value={bio}
                                        onChange={(e) => { setBio(e.target.value); setBioCharCount(e.target.value.length); }}
                                        placeholder="Write about your self <3"
                                        className="profile-textarea"
                                        maxLength={150}
                                    />
                                    <div className={`char-counter ${bioCharCount > 130 ? 'char-counter-warning' : ''} ${bioCharCount >= 150 ? 'char-counter-limit' : ''}`}>
                                        {bioCharCount}/150
                                    </div>
                                    <SaveButton loading={bio$.loading} onClick={handleSaveBio} />
                                </>
                            ) : (
                                <div className="view-only-text">{bio || 'No bio yet'}</div>
                            )}
                            <FieldFeedback error={bio$.error} success={bio$.success} />
                        </div>

                        {/* FR6.1: Username */}
                        <div className="form-group">
                            <div className="field-header">
                                <label>Username</label>
                                <EditToggleButton isEditing={editMode.username} onToggle={() => toggleEditMode('username')} />
                            </div>
                            {editMode.username ? (
                                <>
                                    <input type="text" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Your username" className="profile-input" />
                                    <SaveButton loading={username$.loading} onClick={handleSaveUsername} />
                                </>
                            ) : (
                                <div className="view-only-text">{username}</div>
                            )}
                            <FieldFeedback error={username$.error} success={username$.success} />
                        </div>
                    </div>

                    {/*  ACCOUNT SECTION  */}
                    <div id="account-section" className="account-section">
                        <h2>Account</h2>
                        <div className="form-group">
                            <div className="field-header">
                                <label>Email Address</label>
                                <EditToggleButton isEditing={editMode.email} onToggle={() => toggleEditMode('email')} />
                            </div>
                            {editMode.email ? (
                                <>
                                    <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="your@email.com" className="profile-input" />
                                    <SaveButton loading={email$.loading} onClick={handleSaveEmail} />
                                </>
                            ) : (
                                <div className="view-only-text">{email}</div>
                            )}
                            <FieldFeedback error={email$.error} success={email$.success} />
                        </div>
                    </div>

                    {/*  PASSWORD SECTION  */}
                    <div id="password-section" className="password-section">
                        <h2>Password</h2>
                        {editMode.password ? (
                            <>
                                <div className="form-group">
                                    <label>Current Password</label>
                                    <input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} placeholder="Enter current password" className="profile-input" />
                                </div>
                                <div className="form-group">
                                    <label>New Password</label>
                                    <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="minimum 8 characters" className="profile-input" />
                                </div>
                                <SaveButton loading={password$.loading} onClick={handleChangePassword} label="Update Password" />
                                <button onClick={() => toggleEditMode('password')} className="cancel-btn">Cancel</button>
                            </>
                        ) : (
                            <button className="edit-btn" onClick={() => toggleEditMode('password')}>✎ Change Password</button>
                        )}
                        <FieldFeedback error={password$.error} success={password$.success} />
                    </div>

                    {/*  LOGOUT SECTION  */}
                    <div id="logout-section" style={{ marginTop: '40px', paddingTop: '20px', borderTop: '1px solid #eaeaea' }}>
                        <button
                            className="logout-btn danger-btn"
                            style={{ backgroundColor: '#dc3545', color: 'white', padding: '10px 20px', borderRadius: '6px', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}
                            onClick={handleLogout}
                        >
                            Log Out of Account
                        </button>
                    </div>

                </div>
            </div>
        </div>
    );
};

export default Profile;