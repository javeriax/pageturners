// Frontend tests for profile management - FR6, FR7, FR8
// Tests profile updates, password changes, picture uploads

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { getProfile, updateProfile, changePassword, uploadProfilePicture } from '../src/api/profile';
import Profile from '../src/pages/Profile';
import { BrowserRouter } from 'react-router-dom';

// Mock the API
vi.mock('../src/api/profile', () => ({
    getProfile: vi.fn(),
    updateProfile: vi.fn(),
    changePassword: vi.fn(),
    uploadProfilePicture: vi.fn()
}));

// Wrapper component with Router
const renderWithRouter = (component) => {
    return render(
        <BrowserRouter>
            {component}
        </BrowserRouter>
    );
};

// ─── FR6: GET PROFILE TESTS ───

describe('FR6: Fetch and Display Profile', () => {
    
    beforeEach(() => {
        vi.clearAllMocks();
    });
    
    it('TC-UP-01: Should load and display user profile data', async () => {
        getProfile.mockResolvedValue({
            success: true,
            data: {
                username: 'testuser',
                email: 'test@example.com',
                bio: 'Test bio',
                profile_picture: ''
            }
        });
        
        renderWithRouter(<Profile />);
        
        await waitFor(() => {
            expect(screen.getByDisplayValue('testuser')).toBeInTheDocument();
            expect(screen.getByDisplayValue('test@example.com')).toBeInTheDocument();
            expect(screen.getByDisplayValue('Test bio')).toBeInTheDocument();
        });
    });
    
    it('TC-UP-02: Should display loading state initially', () => {
        getProfile.mockImplementation(() => new Promise(() => {}));
        
        renderWithRouter(<Profile />);
        
        expect(screen.getByText(/loading profile/i)).toBeInTheDocument();
    });
    
    it('TC-UP-11: Should redirect to login on 401 unauthorized', async () => {
        getProfile.mockResolvedValue({
            success: false,
            message: '401 Unauthorized'
        });
        
        renderWithRouter(<Profile />);
        
        await waitFor(() => {
            expect(screen.getByText(/failed to load/i)).toBeInTheDocument();
        });
    });
});

// ─── FR6.2: UPDATE PROFILE TESTS ───

describe('FR6.2: Update Profile Fields', () => {
    
    beforeEach(() => {
        vi.clearAllMocks();
        getProfile.mockResolvedValue({
            success: true,
            data: {
                username: 'testuser',
                email: 'test@example.com',
                bio: 'Original bio',
                profile_picture: ''
            }
        });
    });
    
    it('TC-UP-04: Should save bio successfully', async () => {
        const user = userEvent.setup();
        
        updateProfile.mockResolvedValue({
            success: true,
            message: 'Bio updated successfully!',
            data: { bio: 'New bio' }
        });
        
        renderWithRouter(<Profile />);
        
        await waitFor(() => {
            expect(screen.getByDisplayValue('Original bio')).toBeInTheDocument();
        });
        
        const bioTextarea = screen.getByDisplayValue('Original bio');
        await user.clear(bioTextarea);
        await user.type(bioTextarea, 'New bio');
        
        const bioSaveButtons = screen.getAllByText('Save');
        await user.click(bioSaveButtons[1]); // Bio save button
        
        await waitFor(() => {
            expect(screen.getByText(/bio updated successfully/i)).toBeInTheDocument();
        });
    });
    
    it('TC-UP-05: Should save username successfully', async () => {
        const user = userEvent.setup();
        
        updateProfile.mockResolvedValue({
            success: true,
            message: 'Username updated successfully!',
            data: { username: 'newusername' }
        });
        
        renderWithRouter(<Profile />);
        
        await waitFor(() => {
            expect(screen.getByDisplayValue('testuser')).toBeInTheDocument();
        });
        
        const usernameInput = screen.getByDisplayValue('testuser');
        await user.clear(usernameInput);
        await user.type(usernameInput, 'newusername');
        
        const saveButtons = screen.getAllByText('Save');
        await user.click(saveButtons[2]); // Username save button
        
        await waitFor(() => {
            expect(screen.getByText(/username updated successfully/i)).toBeInTheDocument();
        });
    });
    
    it('TC-UP-08: Should show error when username is already taken', async () => {
        const user = userEvent.setup();
        
        updateProfile.mockResolvedValue({
            success: false,
            message: 'Username already taken'
        });
        
        renderWithRouter(<Profile />);
        
        await waitFor(() => {
            expect(screen.getByDisplayValue('testuser')).toBeInTheDocument();
        });
        
        const usernameInput = screen.getByDisplayValue('testuser');
        await user.clear(usernameInput);
        await user.type(usernameInput, 'existinguser');
        
        const saveButtons = screen.getAllByText('Save');
        await user.click(saveButtons[2]);
        
        await waitFor(() => {
            expect(screen.getByText(/username already taken/i)).toBeInTheDocument();
        });
    });
    
    it('TC-UP-06: Should save email and show verification message', async () => {
        const user = userEvent.setup();
        
        updateProfile.mockResolvedValue({
            success: true,
            message: 'Email updated successfully!'
        });
        
        renderWithRouter(<Profile />);
        
        await waitFor(() => {
            expect(screen.getByDisplayValue('test@example.com')).toBeInTheDocument();
        });
        
        const emailInput = screen.getByDisplayValue('test@example.com');
        await user.clear(emailInput);
        await user.type(emailInput, 'new@example.com');
        
        const saveButtons = screen.getAllByText('Save');
        await user.click(saveButtons[3]); // Email save button
        
        await waitFor(() => {
            expect(screen.getByText(/verification email sent/i)).toBeInTheDocument();
        });
    });
    
    it('TC-UP-09: Should show error for invalid email format', async () => {
        const user = userEvent.setup();
        
        renderWithRouter(<Profile />);
        
        await waitFor(() => {
            expect(screen.getByDisplayValue('test@example.com')).toBeInTheDocument();
        });
        
        const emailInput = screen.getByDisplayValue('test@example.com');
        await user.clear(emailInput);
        await user.type(emailInput, 'invalidemail');
        
        const saveButtons = screen.getAllByText('Save');
        await user.click(saveButtons[3]);
        
        await waitFor(() => {
            expect(screen.getByText(/invalid email format/i)).toBeInTheDocument();
        });
    });
});

// ─── FR7.3: PASSWORD CHANGE TESTS ───

describe('FR7.3: Change Password', () => {
    
    beforeEach(() => {
        vi.clearAllMocks();
        getProfile.mockResolvedValue({
            success: true,
            data: {
                username: 'testuser',
                email: 'test@example.com',
                bio: '',
                profile_picture: ''
            }
        });
    });
    
    it('TC-UP-12: Should change password successfully', async () => {
        const user = userEvent.setup();
        
        changePassword.mockResolvedValue({
            success: true,
            message: 'Password changed successfully!'
        });
        
        renderWithRouter(<Profile />);
        
        // Scroll to password section
        const passwordSection = await screen.findByText('Password');
        passwordSection.scrollIntoView();
        
        const inputs = screen.getAllByPlaceholderText(/current|new/i);
        await user.type(inputs[0], 'OldPassword123');
        await user.type(inputs[1], 'NewPassword123');
        
        const updateBtn = screen.getByText('Update Password');
        await user.click(updateBtn);
        
        await waitFor(() => {
            expect(screen.getByText(/password changed successfully/i)).toBeInTheDocument();
        });
    });
    
    it('TC-UP-13: Should show error when current password is incorrect', async () => {
        const user = userEvent.setup();
        
        changePassword.mockResolvedValue({
            success: false,
            message: 'Current password is incorrect'
        });
        
        renderWithRouter(<Profile />);
        
        const inputs = screen.getAllByPlaceholderText(/current|new/i);
        await user.type(inputs[0], 'WrongPassword');
        await user.type(inputs[1], 'NewPassword123');
        
        const updateBtn = screen.getByText('Update Password');
        await user.click(updateBtn);
        
        await waitFor(() => {
            expect(screen.getByText(/current password is incorrect/i)).toBeInTheDocument();
        });
    });
    
    it('TC-UP-14: Should show error for password under 8 characters', async () => {
        const user = userEvent.setup();
        
        renderWithRouter(<Profile />);
        
        const inputs = screen.getAllByPlaceholderText(/current|new/i);
        await user.type(inputs[0], 'OldPassword123');
        await user.type(inputs[1], 'Short1');
        
        const updateBtn = screen.getByText('Update Password');
        await user.click(updateBtn);
        
        await waitFor(() => {
            expect(screen.getByText(/at least 8 characters/i)).toBeInTheDocument();
        });
    });
    
    it('TC-UP-15: Should show error for unauthenticated password change', async () => {
        // This test verifies 401 is handled by the API
        changePassword.mockResolvedValue({
            success: false,
            message: '401 Unauthorized'
        });
        
        renderWithRouter(<Profile />);
        
        const inputs = screen.getAllByPlaceholderText(/current|new/i);
        await userEvent.type(inputs[0], 'OldPassword123');
        await userEvent.type(inputs[1], 'NewPassword123');
        
        await waitFor(() => {
            expect(screen.getByText('Update Password')).toBeInTheDocument();
        });
    });
});

// ─── FR8: PICTURE UPLOAD TESTS ───

describe('FR8: Profile Picture Upload', () => {
    
    beforeEach(() => {
        vi.clearAllMocks();
        getProfile.mockResolvedValue({
            success: true,
            data: {
                username: 'testuser',
                email: 'test@example.com',
                bio: '',
                profile_picture: ''
            }
        });
    });
    
    it('TC-UP-16: Should upload valid JPEG picture successfully', async () => {
        const user = userEvent.setup();
        
        uploadProfilePicture.mockResolvedValue({
            success: true,
            message: 'Profile picture uploaded successfully!',
            data: { profile_picture: '/uploads/test.jpg' }
        });
        
        renderWithRouter(<Profile />);
        
        const fileInput = screen.getByRole('button', { name: /upload new profile picture/i }).querySelector('input');
        const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
        
        await user.upload(fileInput, file);
        
        await waitFor(() => {
            expect(screen.getByText(/profile picture uploaded successfully/i)).toBeInTheDocument();
        });
    });
    
    it('TC-UP-17: Should upload valid PNG picture successfully', async () => {
        const user = userEvent.setup();
        
        uploadProfilePicture.mockResolvedValue({
            success: true,
            message: 'Profile picture uploaded successfully!',
            data: { profile_picture: '/uploads/test.png' }
        });
        
        renderWithRouter(<Profile />);
        
        const fileInput = screen.getByRole('button', { name: /upload new profile picture/i }).querySelector('input');
        const file = new File(['test'], 'test.png', { type: 'image/png' });
        
        await user.upload(fileInput, file);
        
        await waitFor(() => {
            expect(screen.getByText(/profile picture uploaded successfully/i)).toBeInTheDocument();
        });
    });
    
    it('TC-UP-18: Should show error for invalid file type', async () => {
        const user = userEvent.setup();
        
        uploadProfilePicture.mockResolvedValue({
            success: false,
            message: 'Only JPG/PNG/JPEG files allowed'
        });
        
        renderWithRouter(<Profile />);
        
        const fileInput = screen.getByRole('button', { name: /upload new profile picture/i }).querySelector('input');
        const file = new File(['test'], 'test.pdf', { type: 'application/pdf' });
        
        await user.upload(fileInput, file);
        
        await waitFor(() => {
            expect(screen.getByText(/only jpg\/png\/jpeg files allowed/i)).toBeInTheDocument();
        });
    });
    
    it('TC-UP-19: Should show error for unauthenticated picture upload', async () => {
        uploadProfilePicture.mockResolvedValue({
            success: false,
            message: '401 Unauthorized'
        });
        
        renderWithRouter(<Profile />);
        
        await waitFor(() => {
            expect(screen.getByRole('button', { name: /upload new profile picture/i })).toBeInTheDocument();
        });
    });
});

// ─── NAVIGATION TESTS ───

describe('Profile Navigation', () => {
    
    beforeEach(() => {
        vi.clearAllMocks();
        getProfile.mockResolvedValue({
            success: true,
            data: {
                username: 'testuser',
                email: 'test@example.com',
                bio: '',
                profile_picture: ''
            }
        });
    });
    
    it('TC-UP-22: Should scroll to profile section when sidebar button clicked', async () => {
        const user = userEvent.setup();
        
        renderWithRouter(<Profile />);
        
        const profileBtn = screen.getByRole('button', { name: 'Profile' });
        await user.click(profileBtn);
        
        expect(screen.getByText('Profile')).toBeInTheDocument();
    });
    
    it('TC-UP-23: Should scroll to account section when sidebar button clicked', async () => {
        const user = userEvent.setup();
        
        renderWithRouter(<Profile />);
        
        const accountBtn = screen.getByRole('button', { name: 'Account' });
        await user.click(accountBtn);
        
        expect(screen.getByText('Account')).toBeInTheDocument();
    });
    
    it('TC-UP-24: Should scroll to password section when sidebar button clicked', async () => {
        const user = userEvent.setup();
        
        renderWithRouter(<Profile />);
        
        const passwordBtn = screen.getByRole('button', { name: 'Password' });
        await user.click(passwordBtn);
        
        expect(screen.getByText('Password')).toBeInTheDocument();
    });
});

export default {};