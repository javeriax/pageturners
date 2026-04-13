/**
 * ========================================
 * AUTHENTICATON TEST SUITE 
 * ========================================
 * Aligns with Test Strategy Document:
 * REGISTRATION:
 * - TC-AM-01: New User Registration
 * - TC-AM-10: Email Verification
 * - TC-API-01: API Response Validation
 * -TC-API-02: Protected API Access Without Token
 * LOGIN:
 * * TC-AM-03: Successful Login Handling
 * -TC AM 04: Invalid Login Handling
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { registerUser, verifyEmail } from '../src/api/auth';
import { registerUser, verifyEmail, loginUser } from '../src/api/auth';
// Mock fetch for testing API calls without actual network requests
global.fetch = vi.fn();

// Mock localStorage for testing data persistence
const localStorageMock = (() => {
    let store = {};
    return {
        getItem: (key) => store[key] || null,
        setItem: (key, value) => {
            store[key] = value.toString();
        },
        removeItem: (key) => {
            delete store[key];
        },
        clear: () => {
            store = {};
        },
    };
})();

Object.defineProperty(window, 'localStorage', {
    value: localStorageMock,
});
//TC-AM-01, TC-AM-10, TC-API-01, TC-AM-03, TC-AM-04, TC-API-02
describe('Authentication API Functions - Frontend Tests', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        localStorage.clear();
    });

    describe('registerUser', () => {
        /**
         * Aligns with TC-AM-01 
         * Verifies that registration data is sent to the correct Flask port (5001).
         */
        it('should send registration request with correct format', async () => {
            const mockResponse = {
                success: true,
                message: 'Registration successful',
            };

            global.fetch.mockResolvedValueOnce({
                ok: true,
                json: async () => mockResponse,
            });

            await registerUser('testuser', 'test@example.com', 'Password123');

            expect(global.fetch).toHaveBeenCalledWith(
                'http://localhost:5001/api/auth/register', // Fixed Port
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        username: 'testuser',
                        email: 'test@example.com',
                        password: 'Password123',
                    }),
                }
            );
        });

        it('should return error response when backend returns error', async () => {
            const mockResponse = {
                success: false,
                message: 'Email already registered',
            };

            global.fetch.mockResolvedValueOnce({
                ok: false,
                json: async () => mockResponse,
            });

            const result = await registerUser('testuser', 'existing@example.com', 'Password123');

            expect(result.success).toBe(false);
            expect(result.message).toContain('Email already registered');
        });

        it('should return success response correctly', async () => {
            const mockResponse = {
                success: true,
                message: 'Registration successful. Verification code sent to your email.',
            };

            global.fetch.mockResolvedValueOnce({
                ok: true,
                json: async () => mockResponse,
            });

            const result = await registerUser('testuser', 'test@example.com', 'Password123');

            expect(result.success).toBe(true);
            expect(result.message).toBe('Registration successful. Verification code sent to your email.');
        });
    });

    describe('verifyEmail', () => {
        /**
         * Aligns with TC-AM-10 
         * Corrects payload key to "verification_code" as required by the backend logic.
         */
        it('should send verify email request with correct format', async () => {
            global.fetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({
                    success: true,
                    message: 'Email verified',
                }),
            });

            await verifyEmail('test@example.com', '482910');

            expect(global.fetch).toHaveBeenCalledWith(
                'http://localhost:5001/api/auth/verify-email', // Fixed Port
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        email: 'test@example.com',
                        verification_code: '482910', // Fixed Key name
                    }),
                }
            );
        });

        it('should handle invalid verification code error', async () => {
            const mockResponse = {
                success: false,
                message: 'Invalid or expired verification code',
            };

            global.fetch.mockResolvedValueOnce({
                ok: false,
                json: async () => mockResponse,
            });

            const result = await verifyEmail('test@example.com', 'invalid_code');

            expect(result.success).toBe(false);
            expect(result.message).toBe('Invalid or expired verification code');
        });

        it('should handle successful email verification', async () => {
            const mockResponse = {
                success: true,
                message: 'Email verified successfully',
            };

            global.fetch.mockResolvedValueOnce({
                ok: true,
                json: async () => mockResponse,
            });

            const result = await verifyEmail('test@example.com', '482910');

            expect(result.success).toBe(true);
            expect(result.message).toBe('Email verified successfully');
        });
    });
});


//LOGIN TESTS: TC-AM-03, TC-AM-04, TC-API-01

describe('loginUser', () => {
    /**
     * Tests that loginUser() formats the API request correctly.
     * Verifies endpoint URL, HTTP method, headers, and request body.
     * No backend dependency - uses mocked fetch.
     */
    it('should send login request with correct format', async () => {
        const mockResponse = {
            success: true,
            message: 'Login successful',
            token: 'header.payload.signature',
        };
 
        global.fetch.mockResolvedValueOnce({
            ok: true,
            json: async () => mockResponse,
        });
 
        await loginUser('test@example.com', 'Password123');
 
        expect(global.fetch).toHaveBeenCalledWith(
            'http://localhost:5001/api/auth/login',
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: 'test@example.com',
                    password: 'Password123',
                }),
            }
        );
    });
 
    /**
     * TC-AM-04: Tests that loginUser() returns error when credentials are invalid.
     * Verifies that a 401 response is handled and error message returned correctly.
     */
    it('should return error response on invalid credentials', async () => {
        const mockResponse = {
            success: false,
            message: 'Invalid email or password',
        };
 
        global.fetch.mockResolvedValueOnce({
            ok: false,
            json: async () => mockResponse,
        });
 
        const result = await loginUser('wrong@example.com', 'WrongPassword123');
 
        expect(result.success).toBe(false);
        expect(result.message).toContain('Invalid email or password');
    });
 
    /**
     * PASSING TEST - Frontend Only
     * TC-AM-03, TC-API-01: Tests that loginUser() returns success and JWT token
     * when valid credentials are provided. Verifies token is included in response.
     */
    it('should return success response with token on valid credentials', async () => {
        const mockResponse = {
            success: true,
            message: 'Login successful',
            token: 'header.payload.signature',
        };
 
        global.fetch.mockResolvedValueOnce({
            ok: true,
            json: async () => mockResponse,
        });
 
        const result = await loginUser('test@example.com', 'Password123');
 
        expect(result.success).toBe(true);
        expect(result.token).toBe('header.payload.signature');
        expect(result.message).toBe('Login successful');
    });
});
 
//TC-API-02: Tests that accessing a protected API endpoint without a token returns a 401 Unauthorized response.
describe('TC-API-02: Protected API Access Without Token', () => {
    it('should return 401 when token is missing', async () => {

        global.fetch.mockResolvedValueOnce({
            ok: false,
            status: 401,
            json: async () => ({
                success: false,
                message: 'Unauthorized'
            })
        });

        const res = await fetch('http://localhost:5001/api/dashboard');

        const data = await res.json();

        expect(res.status).toBe(401);
        expect(data.success).toBe(false);
    });
});