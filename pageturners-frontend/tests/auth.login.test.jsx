// LOGIN COMPONENT TESTS (FRONTEND UNIT TESTS)
// Covers Test Strategy Cases:
// TC-AM-01 Login UI Rendering
// TC-AM-02 Form Fields Accessibility
// TC-AM-03 Successful Login Submission Flow (API call triggered correctly)
// TC-AM-04 Form Validation (client-side validation rules)
// TC-API-01 Login API Integration (frontend to API interaction safety)

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import Login from '../src/pages/Login';
import * as authApi from '../src/api/auth';

vi.mock('../src/api/auth', () => ({
    loginUser: vi.fn(),
}));

// helper to render with router:
const renderWithRouter = (ui) =>
    render(<BrowserRouter>{ui}</BrowserRouter>);

describe('Login Component Tests', () => {

    beforeEach(() => {
        vi.clearAllMocks();
        localStorage.clear();
    });

    // constants for selectors (UI element access abstraction)
    const getEmail = () => screen.getByLabelText(/email/i);
    const getPassword = () => screen.getByLabelText(/password/i);
    const getButton = () => screen.getByRole('button', { name: /login/i });

    // TC-AM-01, TC-AM-02: Rendering Tests
    describe('Rendering', () => {

        it('renders form elements', () => {
            renderWithRouter(<Login />);
            expect(getEmail()).toBeInTheDocument();
            expect(getPassword()).toBeInTheDocument();
            expect(getButton()).toBeInTheDocument();
        });
    });

    // TC-AM-04: Validation Tests
    describe('Validation', () => {

        it('shows error when email is empty', async () => {
            const user = userEvent.setup();
            renderWithRouter(<Login />);

            await user.click(getButton());

            expect(await screen.findByText(/email is required/i)).toBeInTheDocument();
        });

        it('shows error when password is empty', async () => {
            const user = userEvent.setup();
            renderWithRouter(<Login />);

            await user.click(getButton());

            expect(await screen.findByText(/password is required/i)).toBeInTheDocument();
        });
    });

    // TC-AM-03, TC-API-01: Submission Tests
    describe('Submission', () => {

        it('calls loginUser with correct data', async () => {
            const user = userEvent.setup();

            vi.mocked(authApi.loginUser).mockResolvedValue({
                success: true,
                token: '123',
            });

            renderWithRouter(<Login />);

            await user.type(getEmail(), 'test@example.com');
            await user.type(getPassword(), 'Password123');
            await user.click(getButton());

            await waitFor(() => {
                expect(authApi.loginUser).toHaveBeenCalledWith(
                    'test@example.com',
                    'Password123'
                );
            });
        });

        it('does not call API when validation fails', async () => {
            const user = userEvent.setup();
            renderWithRouter(<Login />);

            await user.click(getButton());

            expect(authApi.loginUser).not.toHaveBeenCalled();
        });
    });
});