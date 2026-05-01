// register component front end testing:
//TC AM01 and TC AM 02:
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import Register from '../src/pages/Register';
import * as authApi from '../src/api/auth';

vi.mock('../src/api/auth', () => ({
    registerUser: vi.fn(),
    loginUser: vi.fn(),
    verifyEmail: vi.fn(),
}));

// Helper function to render with Router
const renderWithRouter = (component) => {
    return render(<BrowserRouter>{component}</BrowserRouter>);
};

describe('Register Component - Frontend Tests', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('Form Rendering', () => {
        it('should render all form fields', () => {
            renderWithRouter(<Register />);

            expect(screen.getByLabelText(/username/i)).toBeInTheDocument();
            expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
            expect(screen.getByLabelText(/^password$/i)).toBeInTheDocument();
            expect(screen.getByLabelText(/confirm password/i)).toBeInTheDocument();
        });

        it('should render the submit button', () => {
            renderWithRouter(<Register />);
            expect(screen.getByTestId('register-submit-btn')).toBeInTheDocument();
        });

        it('should render heading and subtitle', () => {
            renderWithRouter(<Register />);
            expect(screen.getByText(/pageturners/i)).toBeInTheDocument();
        });

        it('should render login link', () => {
            renderWithRouter(<Register />);
            expect(screen.getByRole('link', { name: /log in/i })).toBeInTheDocument();
        });
    });

    describe('Form Validation', () => {
        it('should show error when username is empty', async () => {
            const user = userEvent.setup();
            renderWithRouter(<Register />);

            const submitBtn = screen.getByTestId('register-submit-btn');
            await user.click(submitBtn);

            expect(await screen.findByText(/username is required/i)).toBeInTheDocument();
        });

        it('should show error when username is less than 3 characters', async () => {
            const user = userEvent.setup();
            renderWithRouter(<Register />);

            const usernameInput = screen.getByTestId('username-input');
            await user.type(usernameInput, 'ab');

            const submitBtn = screen.getByTestId('register-submit-btn');
            await user.click(submitBtn);

            expect(
                await screen.findByText(/username must be at least 3 characters/i)
            ).toBeInTheDocument();
        });

        it('should show error when username exceeds 20 characters', async () => {
            const user = userEvent.setup();
            renderWithRouter(<Register />);

            const usernameInput = screen.getByTestId('username-input');
            await user.type(usernameInput, 'a'.repeat(21));

            const submitBtn = screen.getByTestId('register-submit-btn');
            await user.click(submitBtn);

            expect(
                await screen.findByText(/username cannot exceed 20 characters/i)
            ).toBeInTheDocument();
        });

        it('should show error when username contains invalid characters', async () => {
            const user = userEvent.setup();
            renderWithRouter(<Register />);

            const usernameInput = screen.getByTestId('username-input');
            await user.type(usernameInput, 'user@name!');

            const submitBtn = screen.getByTestId('register-submit-btn');
            await user.click(submitBtn);

            expect(
                await screen.findByText(/username can only contain letters/i)
            ).toBeInTheDocument();
        });

        it('should show error when email is empty', async () => {
            const user = userEvent.setup();
            renderWithRouter(<Register />);

            const submitBtn = screen.getByTestId('register-submit-btn');
            await user.click(submitBtn);

            expect(await screen.findByText(/email is required/i)).toBeInTheDocument();
        });

        it('should show error when email is invalid', async () => {
            const user = userEvent.setup();
            renderWithRouter(<Register />);

            const emailInput = screen.getByTestId('email-input');
            await user.type(emailInput, 'invalidemail');

            const submitBtn = screen.getByTestId('register-submit-btn');
            await user.click(submitBtn);

            expect(
                await screen.findByText(/please enter a valid email address/i)
            ).toBeInTheDocument();
        });

        it('should show error when password is empty', async () => {
            const user = userEvent.setup();
            renderWithRouter(<Register />);

            const submitBtn = screen.getByTestId('register-submit-btn');
            await user.click(submitBtn);

            expect(await screen.findByText(/password is required/i)).toBeInTheDocument();
        });

        it('should show error when password is less than 8 characters', async () => {
            const user = userEvent.setup();
            renderWithRouter(<Register />);

            const passwordInput = screen.getByTestId('password-input');
            await user.type(passwordInput, 'Pass123');

            const submitBtn = screen.getByTestId('register-submit-btn');
            await user.click(submitBtn);

            expect(
                await screen.findByText(/password must be at least 8 characters/i)
            ).toBeInTheDocument();
        });

        it('should show error when password lacks lowercase letter', async () => {
            const user = userEvent.setup();
            renderWithRouter(<Register />);

            const passwordInput = screen.getByTestId('password-input');
            await user.type(passwordInput, 'PASS1234');

            const submitBtn = screen.getByTestId('register-submit-btn');
            await user.click(submitBtn);

            expect(
                await screen.findByText(/password must contain at least one lowercase letter/i)
            ).toBeInTheDocument();
        });

        it('should show error when password lacks uppercase letter', async () => {
            const user = userEvent.setup();
            renderWithRouter(<Register />);

            const passwordInput = screen.getByTestId('password-input');
            await user.type(passwordInput, 'pass1234');

            const submitBtn = screen.getByTestId('register-submit-btn');
            await user.click(submitBtn);

            expect(
                await screen.findByText(/password must contain at least one uppercase letter/i)
            ).toBeInTheDocument();
        });

        it('should show error when password lacks number', async () => {
            const user = userEvent.setup();
            renderWithRouter(<Register />);

            const passwordInput = screen.getByTestId('password-input');
            await user.type(passwordInput, 'Password');

            const submitBtn = screen.getByTestId('register-submit-btn');
            await user.click(submitBtn);

            expect(
                await screen.findByText(/password must contain at least one number/i)
            ).toBeInTheDocument();
        });

        it('should show error when passwords do not match', async () => {
            const user = userEvent.setup();
            renderWithRouter(<Register />);

            const passwordInput = screen.getByTestId('password-input');
            const confirmPasswordInput = screen.getByTestId('confirm-password-input');

            await user.type(passwordInput, 'Password123');
            await user.type(confirmPasswordInput, 'Password456');

            const submitBtn = screen.getByTestId('register-submit-btn');
            await user.click(submitBtn);

            expect(await screen.findByText(/passwords do not match/i)).toBeInTheDocument();
        });

        it('should show error when confirm password is empty', async () => {
            const user = userEvent.setup();
            renderWithRouter(<Register />);

            const submitBtn = screen.getByTestId('register-submit-btn');
            await user.click(submitBtn);

            expect(
                await screen.findByText(/please confirm your password/i)
            ).toBeInTheDocument();
        });

        it('should accept valid username formats', async () => {
            const user = userEvent.setup();
            renderWithRouter(<Register />);

            const usernameInput = screen.getByTestId('username-input');
            await user.type(usernameInput, 'valid_user-123');

            const emailInput = screen.getByTestId('email-input');
            await user.type(emailInput, 'test@example.com');

            const passwordInput = screen.getByTestId('password-input');
            await user.type(passwordInput, 'Password123');

            const confirmPasswordInput = screen.getByTestId('confirm-password-input');
            await user.type(confirmPasswordInput, 'Password123');

            const submitBtn = screen.getByTestId('register-submit-btn');
            await user.click(submitBtn);

            // Should not show username error
            expect(screen.queryByText(/username must be at least 3 characters/i)).not.toBeInTheDocument();
        });
    });

    describe('Form Submission', () => {
        it('should call registerUser API with correct data on valid form submission', async () => {
            const user = userEvent.setup();
            vi.mocked(authApi.registerUser).mockResolvedValue({
                success: true,
                message: 'Registration successful. Verification code sent to your email.',
            });

            renderWithRouter(<Register />);

            const usernameInput = screen.getByTestId('username-input');
            const emailInput = screen.getByTestId('email-input');
            const passwordInput = screen.getByTestId('password-input');
            const confirmPasswordInput = screen.getByTestId('confirm-password-input');

            await user.type(usernameInput, 'testuser');
            await user.type(emailInput, 'test@example.com');
            await user.type(passwordInput, 'Password123');
            await user.type(confirmPasswordInput, 'Password123');

            const submitBtn = screen.getByTestId('register-submit-btn');
            await user.click(submitBtn);

            await waitFor(() => {
                expect(authApi.registerUser).toHaveBeenCalledWith(
                    'testuser',
                    'test@example.com',
                    'Password123'
                );
            });
        });

        it('should not call registerUser API when form validation fails', async () => {
            const user = userEvent.setup();
            renderWithRouter(<Register />);

            const submitBtn = screen.getByTestId('register-submit-btn');
            await user.click(submitBtn);

            expect(authApi.registerUser).not.toHaveBeenCalled();
        });

        it('should display loading state during submission', async () => {
            const user = userEvent.setup();
            vi.mocked(authApi.registerUser).mockImplementation(
                () =>
                    new Promise((resolve) =>
                        setTimeout(
                            () =>
                                resolve({
                                    success: true,
                                    message: 'Registration successful',
                                }),
                            1000
                        )
                    )
            );

            renderWithRouter(<Register />);

            const usernameInput = screen.getByTestId('username-input');
            const emailInput = screen.getByTestId('email-input');
            const passwordInput = screen.getByTestId('password-input');
            const confirmPasswordInput = screen.getByTestId('confirm-password-input');

            await user.type(usernameInput, 'testuser');
            await user.type(emailInput, 'test@example.com');
            await user.type(passwordInput, 'Password123');
            await user.type(confirmPasswordInput, 'Password123');

            const submitBtn = screen.getByTestId('register-submit-btn');
            await user.click(submitBtn);

            // Button should show loading state
            expect(submitBtn.textContent).toBe('Creating Account...');
            expect(submitBtn).toBeDisabled();
        });
    });

    describe('Success Message', () => {
        it('should display success message on successful registration', async () => {
            const user = userEvent.setup();
            vi.mocked(authApi.registerUser).mockResolvedValue({
                success: true,
                message: 'Registration successful. Verification code sent to your email.',
            });

            renderWithRouter(<Register />);

            const usernameInput = screen.getByTestId('username-input');
            const emailInput = screen.getByTestId('email-input');
            const passwordInput = screen.getByTestId('password-input');
            const confirmPasswordInput = screen.getByTestId('confirm-password-input');

            await user.type(usernameInput, 'testuser');
            await user.type(emailInput, 'test@example.com');
            await user.type(passwordInput, 'Password123');
            await user.type(confirmPasswordInput, 'Password123');

            const submitBtn = screen.getByTestId('register-submit-btn');
            await user.click(submitBtn);

            expect(
                await screen.findByText(/registration successful. verification code sent/i)
            ).toBeInTheDocument();
        });

        it('should clear form fields after successful registration', async () => {
            const user = userEvent.setup();
            vi.mocked(authApi.registerUser).mockResolvedValue({
                success: true,
                message: 'Registration successful',
            });

            renderWithRouter(<Register />);

            const usernameInput = screen.getByTestId('username-input');
            const emailInput = screen.getByTestId('email-input');
            const passwordInput = screen.getByTestId('password-input');
            const confirmPasswordInput = screen.getByTestId('confirm-password-input');

            await user.type(usernameInput, 'testuser');
            await user.type(emailInput, 'test@example.com');
            await user.type(passwordInput, 'Password123');
            await user.type(confirmPasswordInput, 'Password123');

            const submitBtn = screen.getByTestId('register-submit-btn');
            await user.click(submitBtn);

            await waitFor(() => {
                expect(usernameInput.value).toBe('');
                expect(emailInput.value).toBe('');
                expect(passwordInput.value).toBe('');
                expect(confirmPasswordInput.value).toBe('');
            });
        });
    });

    describe('Error Handling', () => {
        it('should display error message on duplicate email', async () => {
            const user = userEvent.setup();
            vi.mocked(authApi.registerUser).mockResolvedValue({
                success: false,
                message: 'Email already registered',
            });

            renderWithRouter(<Register />);

            const usernameInput = screen.getByTestId('username-input');
            const emailInput = screen.getByTestId('email-input');
            const passwordInput = screen.getByTestId('password-input');
            const confirmPasswordInput = screen.getByTestId('confirm-password-input');

            await user.type(usernameInput, 'testuser');
            await user.type(emailInput, 'existing@example.com');
            await user.type(passwordInput, 'Password123');
            await user.type(confirmPasswordInput, 'Password123');

            const submitBtn = screen.getByTestId('register-submit-btn');
            await user.click(submitBtn);

            expect(await screen.findByText(/email already registered/i)).toBeInTheDocument();
        });

        it('should display error message on API failure', async () => {
            const user = userEvent.setup();
            vi.mocked(authApi.registerUser).mockResolvedValue({
                success: false,
                message: 'Server error occurred',
            });

            renderWithRouter(<Register />);

            const usernameInput = screen.getByTestId('username-input');
            const emailInput = screen.getByTestId('email-input');
            const passwordInput = screen.getByTestId('password-input');
            const confirmPasswordInput = screen.getByTestId('confirm-password-input');

            await user.type(usernameInput, 'testuser');
            await user.type(emailInput, 'test@example.com');
            await user.type(passwordInput, 'Password123');
            await user.type(confirmPasswordInput, 'Password123');

            const submitBtn = screen.getByTestId('register-submit-btn');
            await user.click(submitBtn);

            expect(await screen.findByText(/server error occurred/i)).toBeInTheDocument();
        });

        it('should clear validation errors when user starts typing', async () => {
            const user = userEvent.setup();
            renderWithRouter(<Register />);

            const submitBtn = screen.getByTestId('register-submit-btn');
            await user.click(submitBtn);

            const usernameError = await screen.findByText(/username is required/i);
            expect(usernameError).toBeInTheDocument();

            const usernameInput = screen.getByTestId('username-input');
            await user.type(usernameInput, 'a');

            // Error should be cleared when user types
            expect(usernameError).not.toBeInTheDocument();
        });
    });

    describe('Edge Cases', () => {
        it('should handle email with special characters', async () => {
            const user = userEvent.setup();
            renderWithRouter(<Register />);

            const emailInput = screen.getByTestId('email-input');
            await user.type(emailInput, 'user+tag@example.co.uk');

            const submitBtn = screen.getByTestId('register-submit-btn');
            await user.click(submitBtn);

            // This is a valid email
            expect(screen.queryByText(/please enter a valid email address/i)).not.toBeInTheDocument();
        });

        it('should handle whitespace in username', async () => {
            const user = userEvent.setup();
            renderWithRouter(<Register />);

            const usernameInput = screen.getByTestId('username-input');
            await user.type(usernameInput, '   test_user   ');

            const emailInput = screen.getByTestId('email-input');
            await user.type(emailInput, 'test@example.com');

            const passwordInput = screen.getByTestId('password-input');
            await user.type(passwordInput, 'Password123');

            const confirmPasswordInput = screen.getByTestId('confirm-password-input');
            await user.type(confirmPasswordInput, 'Password123');

            const submitBtn = screen.getByTestId('register-submit-btn');
            await user.click(submitBtn);

            // Whitespace should cause validation error
            expect(
                await screen.findByText(/username can only contain letters/i)
            ).toBeInTheDocument();
        });

        it('should disable form inputs during submission', async () => {
            const user = userEvent.setup();
            vi.mocked(authApi.registerUser).mockImplementation(
                () =>
                    new Promise((resolve) =>
                        setTimeout(
                            () =>
                                resolve({
                                    success: true,
                                    message: 'Registration successful',
                                }),
                            500
                        )
                    )
            );

            renderWithRouter(<Register />);

            const usernameInput = screen.getByTestId('username-input');
            const emailInput = screen.getByTestId('email-input');
            const passwordInput = screen.getByTestId('password-input');
            const confirmPasswordInput = screen.getByTestId('confirm-password-input');

            await user.type(usernameInput, 'testuser');
            await user.type(emailInput, 'test@example.com');
            await user.type(passwordInput, 'Password123');
            await user.type(confirmPasswordInput, 'Password123');

            const submitBtn = screen.getByTestId('register-submit-btn');
            await user.click(submitBtn);

            // Inputs should be disabled during submission
            expect(usernameInput).toBeDisabled();
            expect(emailInput).toBeDisabled();
            expect(passwordInput).toBeDisabled();
            expect(confirmPasswordInput).toBeDisabled();
        });

        it('should handle rapid form submission attempts', async () => {
            const user = userEvent.setup();
            vi.mocked(authApi.registerUser).mockResolvedValue({
                success: true,
                message: 'Registration successful',
            });

            renderWithRouter(<Register />);

            const usernameInput = screen.getByTestId('username-input');
            const emailInput = screen.getByTestId('email-input');
            const passwordInput = screen.getByTestId('password-input');
            const confirmPasswordInput = screen.getByTestId('confirm-password-input');

            await user.type(usernameInput, 'testuser');
            await user.type(emailInput, 'test@example.com');
            await user.type(passwordInput, 'Password123');
            await user.type(confirmPasswordInput, 'Password123');

            const submitBtn = screen.getByTestId('register-submit-btn');
            await user.click(submitBtn);
            await user.click(submitBtn);

            await waitFor(() => {
                // Should only call API once despite multiple clicks
                expect(authApi.registerUser).toHaveBeenCalledTimes(1);
            });
        });
    });
});
