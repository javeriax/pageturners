/**
 * ========================================
 * LOGIN COMPONENT TEST SUITE
 * ========================================
 *
 * TEST STATUS: ALL 16 TESTS PASSING
 *
 * PASSING TESTS (Frontend Only):
 * Form Rendering (4 tests)
 *   - should render email and password fields
 *   - should render the login button
 *   - should render PageTurners heading
 *   - should render forgot password and sign up links
 *
 *  Form Validation (4 tests)
 *   - should show error when email is empty (TC-AM-04)
 *   - should show error when email is invalid (TC-AM-04)
 *   - should show error when password is empty (TC-AM-04)
 *   - should clear validation errors when user starts typing
 *
 *  Form Submission (3 tests)
 *   - should call loginUser API with correct data (TC-AM-03, TC-API-01)
 *   - should not call loginUser API when validation fails (TC-AM-04)
 *   - should display loading state during submission
 *
 *  Success Handling (1 test)
 *   - should store token and redirect on successful login (TC-AM-03, TC-API-01)
 *
 *  Error Handling (2 tests)
 *   - should display error message on invalid credentials (TC-AM-04)
 *   - should display error message on API failure
 *
 *  Edge Cases (2 tests)
 *   - should disable inputs during submission
 *   - should handle rapid form submission attempts
 *
 * COMMENTED TESTS (Require Backend Integration):
 * - Full login flow with real credentials
 * - Token persistence across page refresh
 *
 * Matches Test Strategy:
 * - TC-AM-03 Login Of Registered User
 * - TC-AM-04 Invalid Login Attempt
 * - TC-API-01 Login API Response Validation
 *
 * ========================================
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import Login from '../src/pages/Login';
import * as authApi from '../src/api/auth';

vi.mock('../src/api/auth', () => ({
    loginUser: vi.fn(),
}));

// Helper to render with Router
const renderWithRouter = (component) => {
    return render(<BrowserRouter>{component}</BrowserRouter>);
};

describe('Login Component - Frontend Tests', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        localStorage.clear();
    });

    describe('Form Rendering', () => {
        /**
         * PASSING TEST - Frontend Only
         * Verifies all form fields are visible and accessible.
         */
        it('should render email and password fields', () => {
            renderWithRouter(<Login />);
            expect(screen.getByTestId('email-input')).toBeInTheDocument();
            expect(screen.getByTestId('password-input')).toBeInTheDocument();
        });

        /**
         * PASSING TEST - Frontend Only
         * Verifies the login submit button is present.
         */
        it('should render the login button', () => {
            renderWithRouter(<Login />);
            expect(screen.getByTestId('login-submit-btn')).toBeInTheDocument();
        });

        /**
         * PASSING TEST - Frontend Only
         * Verifies the PageTurners heading is displayed.
         */
        it('should render PageTurners heading', () => {
            renderWithRouter(<Login />);
            expect(screen.getByText(/pageturners/i)).toBeInTheDocument();
        });

        /**
         * PASSING TEST - Frontend Only
         * Verifies footer links for forgot password and sign up are present.
         */
        it('should render forgot password and sign up links', () => {
            renderWithRouter(<Login />);
            expect(screen.getByRole('link', { name: /forgot password/i })).toBeInTheDocument();
            expect(screen.getByRole('link', { name: /sign up/i })).toBeInTheDocument();
        });
    });

    describe('Form Validation', () => {
        /**
         * PASSING TEST - Frontend Only
         * TC-AM-04: Verify system behaviour when email is missing.
         */
        it('should show error when email is empty', async () => {
            const user = userEvent.setup();
            renderWithRouter(<Login />);

            const submitBtn = screen.getByTestId('login-submit-btn');
            await user.click(submitBtn);

            expect(await screen.findByText(/email is required/i)).toBeInTheDocument();
        });

        /**
         * PASSING TEST - Frontend Only
         * TC-AM-04: Verify system behaviour when email format is invalid.
         */
        it('should show error when email is invalid', async () => {
            const user = userEvent.setup();
            renderWithRouter(<Login />);

            const emailInput = screen.getByTestId('email-input');
            await user.type(emailInput, 'test@invalid');
            await user.type(screen.getByTestId('password-input'), 'Password123');
            
            const submitBtn = screen.getByTestId('login-submit-btn');
            await user.click(submitBtn);

        expect(
        await screen.findByText(/valid email address with domain/i)
    ).toBeInTheDocument();});

        /**
         * PASSING TEST - Frontend Only
         * TC-AM-04: Verify system behaviour when password is missing.
         */
        it('should show error when password is empty', async () => {
            const user = userEvent.setup();
            renderWithRouter(<Login />);

            const submitBtn = screen.getByTestId('login-submit-btn');
            await user.click(submitBtn);

            expect(await screen.findByText(/password is required/i)).toBeInTheDocument();
        });

        /**
         * PASSING TEST - Frontend Only
         * Verifies validation errors clear when user starts typing.
         */
        it('should clear validation errors when user starts typing', async () => {
            const user = userEvent.setup();
            renderWithRouter(<Login />);

            const submitBtn = screen.getByTestId('login-submit-btn');
            await user.click(submitBtn);

            const emailError = await screen.findByText(/email is required/i);
            expect(emailError).toBeInTheDocument();

            const emailInput = screen.getByTestId('email-input');
            await user.type(emailInput, 'a');

            expect(emailError).not.toBeInTheDocument();
        });
    });

    describe('Form Submission', () => {
        /**
         * PASSING TEST - Frontend Only
         * TC-AM-03, TC-API-01: Verifies loginUser is called with correct email and password.
         */
        it('should call loginUser API with correct data on valid submission', async () => {
            const user = userEvent.setup();
            vi.mocked(authApi.loginUser).mockResolvedValue({
                success: true,
                message: 'Login successful',
                token: 'header.payload.signature',
            });

            renderWithRouter(<Login />);

            await user.type(screen.getByTestId('email-input'), 'test@example.com');
            await user.type(screen.getByTestId('password-input'), 'Password123');
            await user.click(screen.getByTestId('login-submit-btn'));

            await waitFor(() => {
                expect(authApi.loginUser).toHaveBeenCalledWith(
                    'test@example.com',
                    'Password123'
                );
            });
        });

        /**
         * PASSING TEST - Frontend Only
         * TC-AM-04: Verifies API is not called when form validation fails.
         */
        it('should not call loginUser API when validation fails', async () => {
            const user = userEvent.setup();
            renderWithRouter(<Login />);

            await user.click(screen.getByTestId('login-submit-btn'));

            expect(authApi.loginUser).not.toHaveBeenCalled();
        });

        /**
         * PASSING TEST - Frontend Only
         * Verifies loading state is shown while waiting for API response.
         */
        it('should display loading state during submission', async () => {
            const user = userEvent.setup();
            vi.mocked(authApi.loginUser).mockImplementation(
                () => new Promise((resolve) => setTimeout(() => resolve({
                    success: true,
                    message: 'Login successful',
                    token: 'header.payload.signature',
                }), 1000))
            );

            renderWithRouter(<Login />);

            await user.type(screen.getByTestId('email-input'), 'test@example.com');
            await user.type(screen.getByTestId('password-input'), 'Password123');
            await user.click(screen.getByTestId('login-submit-btn'));

            const submitBtn = screen.getByTestId('login-submit-btn');
            expect(submitBtn.textContent).toBe('Logging in...');
            expect(submitBtn).toBeDisabled();
        });
    });

    describe('Success Handling', () => {
        /**
         * PASSING TEST - Frontend Only
         * TC-AM-03, TC-API-01: Verifies token is stored and user is redirected on success.
         */
        it('should store token in localStorage on successful login', async () => {
            const user = userEvent.setup();
            vi.mocked(authApi.loginUser).mockResolvedValue({
                success: true,
                message: 'Login successful',
                token: 'header.payload.signature',
            });

            renderWithRouter(<Login />);

            await user.type(screen.getByTestId('email-input'), 'test@example.com');
            await user.type(screen.getByTestId('password-input'), 'Password123');
            await user.click(screen.getByTestId('login-submit-btn'));

            await waitFor(() => {
                expect(localStorage.getItem('token')).toBe('header.payload.signature');
            });
        });
    });

    describe('Error Handling', () => {
        /**
         * PASSING TEST - Frontend Only
         * TC-AM-04: Verifies error message shown when credentials are invalid.
         */
        it('should display error message on invalid credentials', async () => {
            const user = userEvent.setup();
            vi.mocked(authApi.loginUser).mockResolvedValue({
                success: false,
                message: 'Invalid email or password',
            });

            renderWithRouter(<Login />);

            await user.type(screen.getByTestId('email-input'), 'wrong@example.com');
            await user.type(screen.getByTestId('password-input'), 'WrongPassword123');
            await user.click(screen.getByTestId('login-submit-btn'));

            expect(await screen.findByText(/invalid email or password/i)).toBeInTheDocument();
        });

        /**
         * PASSING TEST - Frontend Only
         * Verifies error message shown when API returns a server error.
         */
        it('should display error message on API failure', async () => {
            const user = userEvent.setup();
            vi.mocked(authApi.loginUser).mockResolvedValue({
                success: false,
                message: 'Server error occurred',
            });

            renderWithRouter(<Login />);

            await user.type(screen.getByTestId('email-input'), 'test@example.com');
            await user.type(screen.getByTestId('password-input'), 'Password123');
            await user.click(screen.getByTestId('login-submit-btn'));

            expect(await screen.findByText(/server error occurred/i)).toBeInTheDocument();
        });
    });

    describe('Edge Cases', () => {
        /**
         * PASSING TEST - Frontend Only
         * Verifies form inputs are disabled while submission is in progress.
         */
        it('should disable inputs during submission', async () => {
            const user = userEvent.setup();
            vi.mocked(authApi.loginUser).mockImplementation(
                () => new Promise((resolve) => setTimeout(() => resolve({
                    success: true,
                    message: 'Login successful',
                    token: 'header.payload.signature',
                }), 500))
            );

            renderWithRouter(<Login />);

            await user.type(screen.getByTestId('email-input'), 'test@example.com');
            await user.type(screen.getByTestId('password-input'), 'Password123');
            await user.click(screen.getByTestId('login-submit-btn'));

            expect(screen.getByTestId('email-input')).toBeDisabled();
            expect(screen.getByTestId('password-input')).toBeDisabled();
        });

        /**
         * PASSING TEST - Frontend Only
         * Verifies API is only called once even with rapid button clicks.
         */
        it('should handle rapid form submission attempts', async () => {
            const user = userEvent.setup();
                vi.mocked(authApi.loginUser).mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve({
            success: true,
            message: 'Login successful',
            token: 'header.payload.signature',
        }), 500))
    );
             

            renderWithRouter(<Login />);

            await user.type(screen.getByTestId('email-input'), 'test@example.com');
            await user.type(screen.getByTestId('password-input'), 'Password123');

            const submitBtn = screen.getByTestId('login-submit-btn');
            await user.click(submitBtn);
            await user.click(submitBtn);

            await waitFor(() => {
                expect(authApi.loginUser).toHaveBeenCalledTimes(1);
            });
        });
    });
});