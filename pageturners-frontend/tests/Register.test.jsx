// @vitest-environment jsdom
/* 
 * type: frontend ui/component tests
 * description: verifies register.jsx ui rendering, input validation, and user interaction.
 * 
 * covers test strategy cases:
 * - TC-AM-01: new user registration (form submission and validation)
 * - TC-AM-02: duplicate email validation (ui error display)
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import Register from '../src/pages/Register';
import * as authApi from '../src/api/auth';
import { describe, it, expect, beforeEach, vi } from 'vitest';

// mock the auth api module
vi.mock('../src/api/auth', () => ({
    registerUser: vi.fn(),
}));

// helper to render with router and silence v7 future flag warnings
const renderWithRouter = (component) => {
    return render(
        <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
            {component}
        </BrowserRouter>
    );
};

describe('Register Component UI', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    // rendering check
    it('renders all registration fields (tc-am-01)', () => {
        renderWithRouter(<Register />);
        expect(screen.getByLabelText(/username/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/^password$/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/confirm password/i)).toBeInTheDocument();
        expect(screen.getByTestId('register-submit-btn')).toBeInTheDocument();
    });

    // success path
    it('submits correctly with valid data (tc-am-01)', async () => {
        const user = userEvent.setup();
        vi.mocked(authApi.registerUser).mockResolvedValue({
            success: true,
            message: 'Registration successful'
        });

        renderWithRouter(<Register />);

        await user.type(screen.getByTestId('username-input'), 'javeria');
        await user.type(screen.getByTestId('email-input'), 'test@habib.edu.pk');
        await user.type(screen.getByTestId('password-input'), 'Password123');
        await user.type(screen.getByTestId('confirm-password-input'), 'Password123');

        await user.click(screen.getByTestId('register-submit-btn'));

        await waitFor(() => {
            expect(authApi.registerUser).toHaveBeenCalledWith('javeria', 'test@habib.edu.pk', 'Password123');
        });
    });

    // duplicate email error
    it('shows error message for existing email (tc-am-02)', async () => {
        const user = userEvent.setup();
        vi.mocked(authApi.registerUser).mockResolvedValue({
            success: false,
            message: 'Email already registered'
        });

        renderWithRouter(<Register />);

        await user.type(screen.getByTestId('username-input'), 'javeria');
        await user.type(screen.getByTestId('email-input'), 'existing@example.com');
        await user.type(screen.getByTestId('password-input'), 'Password123');
        await user.type(screen.getByTestId('confirm-password-input'), 'Password123');

        await user.click(screen.getByTestId('register-submit-btn'));

        expect(await screen.findByText(/email already registered/i)).toBeInTheDocument();
    });

    // password mismatch validation
    it('shows error when passwords do not match (tc-am-01)', async () => {
        const user = userEvent.setup();
        renderWithRouter(<Register />);

        await user.type(screen.getByTestId('password-input'), 'Password123');
        await user.type(screen.getByTestId('confirm-password-input'), 'WrongPassword456');

        await user.click(screen.getByTestId('register-submit-btn'));

        expect(await screen.findByText(/passwords do not match/i)).toBeInTheDocument();
        // ensure api is never called if local validation fails
        expect(authApi.registerUser).not.toHaveBeenCalled();
    });

    // loading state check
    it('disables submit button and shows loading state during submission (tc-am-01)', async () => {
        const user = userEvent.setup();
        // simulate slow network
        vi.mocked(authApi.registerUser).mockImplementation(() =>
            new Promise(resolve => setTimeout(() => resolve({ success: true }), 500))
        );

        renderWithRouter(<Register />);

        await user.type(screen.getByTestId('username-input'), 'javeria');
        await user.type(screen.getByTestId('email-input'), 'test@habib.edu.pk');
        await user.type(screen.getByTestId('password-input'), 'Password123');
        await user.type(screen.getByTestId('confirm-password-input'), 'Password123');

        await user.click(screen.getByTestId('register-submit-btn'));

        const submitBtn = screen.getByTestId('register-submit-btn');
        expect(submitBtn).toBeDisabled();
        expect(submitBtn.textContent).toMatch(/creating account|loading/i);
    });

    // field cleanup
    it('clears form fields after successful registration (tc-am-01)', async () => {
        const user = userEvent.setup();
        vi.mocked(authApi.registerUser).mockResolvedValue({ success: true, message: 'Success' });

        renderWithRouter(<Register />);

        const usernameInput = screen.getByTestId('username-input');
        const emailInput = screen.getByTestId('email-input');

        await user.type(usernameInput, 'javeria');
        await user.type(emailInput, 'test@habib.edu.pk');
        await user.type(screen.getByTestId('password-input'), 'Password123');
        await user.type(screen.getByTestId('confirm-password-input'), 'Password123');

        await user.click(screen.getByTestId('register-submit-btn'));

        await waitFor(() => {
            expect(usernameInput.value).toBe('');
            expect(emailInput.value).toBe('');
        });
    });

    // dynamic validation cleanup
    it('clears validation errors when user starts typing', async () => {
        const user = userEvent.setup();
        renderWithRouter(<Register />);

        // trigger an error by clicking submit on empty form
        await user.click(screen.getByTestId('register-submit-btn'));
        const error = await screen.findByText(/username is required/i);
        expect(error).toBeInTheDocument();

        // start typing to clear error
        await user.type(screen.getByTestId('username-input'), 'j');
        expect(screen.queryByText(/username is required/i)).not.toBeInTheDocument();
    });
});