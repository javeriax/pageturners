import { describe, it, expect, beforeEach, vi } from 'vitest';
import { registerUser, loginUser, logoutUser, verifyEmail } from './auth';

// Mock fetch
global.fetch = vi.fn();

// Mock localStorage
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

describe('Authentication API Functions', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        localStorage.clear();
    });

    describe('registerUser', () => {
        it('should successfully register a user with valid data', async () => {
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
            expect(global.fetch).toHaveBeenCalledWith(
                'http://localhost:5000/api/auth/register',
                expect.objectContaining({
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        username: 'testuser',
                        email: 'test@example.com',
                        password: 'Password123',
                    }),
                })
            );
        });

        it('should return error when email is already registered', async () => {
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
            expect(result.message).toBe('Email already registered');
        });

        it('should handle network errors gracefully', async () => {
            global.fetch.mockRejectedValueOnce(new Error('Network error'));

            const result = await registerUser('testuser', 'test@example.com', 'Password123');

            expect(result.success).toBe(false);
            expect(result.message).toContain('Network error');
        });

        it('should handle missing error message from API', async () => {
            global.fetch.mockResolvedValueOnce({
                ok: false,
                json: async () => ({}),
            });

            const result = await registerUser('testuser', 'test@example.com', 'Password123');

            expect(result.success).toBe(false);
            expect(result.message).toContain('Registration failed');
        });

        it('should send correct request body format', async () => {
            global.fetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({
                    success: true,
                    message: 'Registration successful',
                }),
            });

            await registerUser('testuser', 'test@example.com', 'Password123');

            const callArgs = global.fetch.mock.calls[0];
            const body = JSON.parse(callArgs[1].body);

            expect(body).toEqual({
                username: 'testuser',
                email: 'test@example.com',
                password: 'Password123',
            });
        });
    });

    describe('loginUser', () => {
        it('should successfully login and store token', async () => {
            const mockResponse = {
                success: true,
                token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
                data: {
                    user_id: 'abc123',
                    username: 'testuser',
                    email: 'test@example.com',
                },
            };

            global.fetch.mockResolvedValueOnce({
                ok: true,
                json: async () => mockResponse,
            });

            const result = await loginUser('test@example.com', 'Password123');

            expect(result.success).toBe(true);
            expect(result.data.token).toBe('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...');
            expect(result.data.user.username).toBe('testuser');
            expect(localStorage.getItem('authToken')).toBe('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...');
        });

        it('should return error for incorrect credentials', async () => {
            const mockResponse = {
                success: false,
                message: 'Incorrect email or password',
            };

            global.fetch.mockResolvedValueOnce({
                ok: false,
                json: async () => mockResponse,
            });

            const result = await loginUser('test@example.com', 'WrongPassword');

            expect(result.success).toBe(false);
            expect(result.message).toBe('Incorrect email or password');
        });

        it('should send credentials in correct format', async () => {
            global.fetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({
                    success: true,
                    token: 'token123',
                    data: {},
                }),
            });

            await loginUser('test@example.com', 'Password123');

            const callArgs = global.fetch.mock.calls[0];
            const body = JSON.parse(callArgs[1].body);

            expect(body).toEqual({
                email: 'test@example.com',
                password: 'Password123',
            });
        });
    });

    describe('logoutUser', () => {
        it('should successfully logout and remove token', async () => {
            localStorage.setItem('authToken', 'test_token_123');

            global.fetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({
                    success: true,
                    message: 'Logged out successfully',
                }),
            });

            const result = await logoutUser();

            expect(result.success).toBe(true);
            expect(localStorage.getItem('authToken')).toBeNull();
            expect(global.fetch).toHaveBeenCalledWith(
                'http://localhost:5000/api/auth/logout',
                expect.objectContaining({
                    method: 'POST',
                    headers: expect.objectContaining({
                        'Authorization': 'Bearer test_token_123',
                    }),
                })
            );
        });

        it('should remove token even if logout fails', async () => {
            localStorage.setItem('authToken', 'test_token_123');

            global.fetch.mockResolvedValueOnce({
                ok: false,
                json: async () => ({
                    success: false,
                    message: 'Logout failed',
                }),
            });

            const result = await logoutUser();

            expect(result.success).toBe(false);
            expect(localStorage.getItem('authToken')).toBeNull();
        });

        it('should handle network error during logout', async () => {
            localStorage.setItem('authToken', 'test_token_123');

            global.fetch.mockRejectedValueOnce(new Error('Network error'));

            const result = await logoutUser();

            expect(result.success).toBe(false);
            expect(localStorage.getItem('authToken')).toBeNull();
        });
    });

    describe('verifyEmail', () => {
        it('should successfully verify email with correct code', async () => {
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
            expect(global.fetch).toHaveBeenCalledWith(
                'http://localhost:5000/api/auth/verify-email',
                expect.objectContaining({
                    method: 'POST',
                    body: JSON.stringify({
                        email: 'test@example.com',
                        code: '482910',
                    }),
                })
            );
        });

        it('should return error for invalid verification code', async () => {
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

        it('should handle network errors during verification', async () => {
            global.fetch.mockRejectedValueOnce(new Error('Network error'));

            const result = await verifyEmail('test@example.com', '482910');

            expect(result.success).toBe(false);
            expect(result.message).toContain('Network error');
        });
    });
});
