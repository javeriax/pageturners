// @vitest-environment jsdom
/* 
 * TYPE: FRONTEND UI/COMPONENT TESTS
 * DESCRIPTION: Verifies Register.jsx UI rendering and user interactions.
 * 
 * COVERS TEST STRATEGY CASES:
 * - TC-AM-01: New User Registration (Form Submission)
 * - TC-AM-02: Duplicate Email Validation (UI Error Display)
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import Register from '../src/pages/Register';
import * as authApi from '../src/api/auth';
import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('../src/api/auth', () => ({
    registerUser: vi.fn(),
}));

// Setup router with future flags to silence the console warnings
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

    it('renders all registration fields (TC-AM-01)', () => {
        renderWithRouter(<Register />);
        expect(screen.getByLabelText(/username/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
        expect(screen.getByTestId('register-submit-btn')).toBeInTheDocument();
    });

    it('submits correctly with valid data (TC-AM-01)', async () => {
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
            expect(authApi.registerUser).toHaveBeenCalled();
        });
    });

    it('shows error message for existing email (TC-AM-02)', async () => {
        const user = userEvent.setup();
        // Mocking the specific duplicate email error response
        vi.mocked(authApi.registerUser).mockResolvedValue({
            success: false,
            message: 'Email already registered'
        });

        renderWithRouter(<Register />);

        // You MUST fill these so the form passes local validation!
        await user.type(screen.getByTestId('username-input'), 'javeria');
        await user.type(screen.getByTestId('email-input'), 'existing@example.com');
        await user.type(screen.getByTestId('password-input'), 'Password123');
        await user.type(screen.getByTestId('confirm-password-input'), 'Password123');

        await user.click(screen.getByTestId('register-submit-btn'));

        // Now the error from the API should appear in the UI
        expect(await screen.findByText(/email already registered/i)).toBeInTheDocument();
    });
});