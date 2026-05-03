/*
 LOGIN COMPONENT TESTS (FRONTEND) : Unit testing
 *
 * Covers:
 * - Form Rendering
 * - Validation (TC-AM-04)
 * - Submission (TC-AM-03, TC-API-01)
 * - Success Handling
 * - Error Handling
 * - Edge Cases
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { vi } from 'vitest';

import Login from '../src/pages/Login';
import * as authApi from '../src/api/auth';

/*MOCKS*/

vi.mock('../src/api/auth', () => ({
    loginUser: vi.fn(),
}));

const renderWithRouter = (component) => {
    return render(<BrowserRouter>{component}</BrowserRouter>);
};

/* TESTS */

describe('Login Component - Frontend Tests', () => {

    beforeEach(() => {
        vi.clearAllMocks();
        localStorage.clear();
    });

    /* Form Rendering */

    describe('Form Rendering', () => {

        it('should render email and password fields', () => {
            renderWithRouter(<Login />);
            expect(screen.getByTestId('email-input')).toBeInTheDocument();
            expect(screen.getByTestId('password-input')).toBeInTheDocument();
        });

        it('should render login button', () => {
            renderWithRouter(<Login />);
            expect(screen.getByTestId('login-submit-btn')).toBeInTheDocument();
        });

        it('should render PageTurners heading', () => {
            renderWithRouter(<Login />);
            expect(screen.getByText(/pageturners/i)).toBeInTheDocument();
        });

        it('should render forgot password and sign up links', () => {
    renderWithRouter(<Login />);
    expect(screen.getByRole('button', { name: /forgot password/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /sign up/i })).toBeInTheDocument();
});

    /* VALIDATION (TC-AM-04) */

    describe('Form Validation', () => {

        it('should show error when email is empty', async () => {
            const user = userEvent.setup();
            renderWithRouter(<Login />);

            await user.click(screen.getByTestId('login-submit-btn'));

            expect(await screen.findByText(/email is required/i)).toBeInTheDocument();
        });

        it('should show error when email is invalid', async () => {
            const user = userEvent.setup();
            renderWithRouter(<Login />);

            await user.type(screen.getByTestId('email-input'), 'test@invalid');
            await user.type(screen.getByTestId('password-input'), 'Password123');
            await user.click(screen.getByTestId('login-submit-btn'));

            expect(
                await screen.findByText(/valid email address with domain/i)
            ).toBeInTheDocument();
        });

        it('should show error when password is empty', async () => {
            const user = userEvent.setup();
            renderWithRouter(<Login />);

            await user.click(screen.getByTestId('login-submit-btn'));

            expect(await screen.findByText(/password is required/i)).toBeInTheDocument();
        });

        it('should clear validation errors on typing', async () => {
            const user = userEvent.setup();
            renderWithRouter(<Login />);

            await user.click(screen.getByTestId('login-submit-btn'));

            const error = await screen.findByText(/email is required/i);
            expect(error).toBeInTheDocument();

            await user.type(screen.getByTestId('email-input'), 'a');
            expect(error).not.toBeInTheDocument();
        });
    });

    /*FORM SUBMISSION */

    describe('Form Submission', () => {

        it('should call loginUser with correct data', async () => {
            const user = userEvent.setup();

            authApi.loginUser.mockResolvedValue({
                success: true,
                token: 'token',
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

        it('should not call loginUser if validation fails', async () => {
            const user = userEvent.setup();
            renderWithRouter(<Login />);

            await user.click(screen.getByTestId('login-submit-btn'));

            expect(authApi.loginUser).not.toHaveBeenCalled();
        });

        it('should show loading state during submission', async () => {
            const user = userEvent.setup();

            authApi.loginUser.mockImplementation(
                () =>
                    new Promise((resolve) =>
                        setTimeout(() => resolve({
                            success: true,
                            token: 'token',
                        }), 500)
                    )
            );

            renderWithRouter(<Login />);

            await user.type(screen.getByTestId('email-input'), 'test@example.com');
            await user.type(screen.getByTestId('password-input'), 'Password123');
            await user.click(screen.getByTestId('login-submit-btn'));

            const btn = screen.getByTestId('login-submit-btn');

            expect(btn).toBeDisabled();
            expect(btn.textContent).toBe('Logging in...');
        });
    });

    /* SUCCESS HANDLING */

    describe('Success Handling', () => {

        it('should store token on successful login', async () => {
            const user = userEvent.setup();

            authApi.loginUser.mockResolvedValue({
                success: true,
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

    /*ERROR HANDLING */

    describe('Error Handling', () => {

        it('should show error on invalid credentials', async () => {
            const user = userEvent.setup();

            authApi.loginUser.mockResolvedValue({
                success: false,
                message: 'Invalid email or password',
            });

            renderWithRouter(<Login />);

            await user.type(screen.getByTestId('email-input'), 'wrong@example.com');
            await user.type(screen.getByTestId('password-input'), 'WrongPassword123');
            await user.click(screen.getByTestId('login-submit-btn'));

            expect(await screen.findByText(/invalid email or password/i)).toBeInTheDocument();
        });

        it('should show error on API failure', async () => {
            const user = userEvent.setup();

            authApi.loginUser.mockResolvedValue({
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

    /* EDGE CASES*/

    describe('Edge Cases', () => {

        it('should disable inputs during submission', async () => {
            const user = userEvent.setup();

            authApi.loginUser.mockImplementation(
                () =>
                    new Promise((resolve) =>
                        setTimeout(() => resolve({
                            success: true,
                            token: 'token',
                        }), 500)
                    )
            );

            renderWithRouter(<Login />);

            await user.type(screen.getByTestId('email-input'), 'test@example.com');
            await user.type(screen.getByTestId('password-input'), 'Password123');
            await user.click(screen.getByTestId('login-submit-btn'));

            expect(screen.getByTestId('email-input')).toBeDisabled();
            expect(screen.getByTestId('password-input')).toBeDisabled();
        });

        it('should prevent multiple rapid submissions', async () => {
            const user = userEvent.setup();

            authApi.loginUser.mockImplementation(
                () =>
                    new Promise((resolve) =>
                        setTimeout(() => resolve({
                            success: true,
                            token: 'token',
                        }), 500)
                    )
            );

            renderWithRouter(<Login />);

            await user.type(screen.getByTestId('email-input'), 'test@example.com');
            await user.type(screen.getByTestId('password-input'), 'Password123');

            const btn = screen.getByTestId('login-submit-btn');

            await user.click(btn);
            await user.click(btn);

            await waitFor(() => {
                expect(authApi.loginUser).toHaveBeenCalledTimes(1);
            });
        });
    });
});
});