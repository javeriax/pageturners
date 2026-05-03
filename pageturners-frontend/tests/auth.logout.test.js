// @vitest-environment jsdom
//logout tests TC-AM-05, TC-AM-06, TC-AM-07, TC-AM-08
import { describe, it, expect, beforeEach, vi } from 'vitest';

global.fetch = vi.fn();

/* Mock localStorage */
const localStorageMock = (() => {
    let store = {};
    return {
        getItem: (key) => store[key] || null,
        setItem: (key, value) => (store[key] = value.toString()),
        removeItem: (key) => delete store[key],
        clear: () => (store = {}),
    };
})();

Object.defineProperty(window, 'localStorage', {
    value: localStorageMock,
});

//TC-AM-05: Secure Logout 
describe('TC-AM-05: Secure Logout (Session termination)', () => {

    beforeEach(() => {
        vi.clearAllMocks();
        localStorage.clear();
    });

    it('TC-AM-05 → should send logout request with valid token and clear localStorage', async () => {
        localStorage.setItem('token', 'valid.jwt.token');

        global.fetch.mockResolvedValueOnce({
            ok: true,
            json: async () => ({
                success: true,
                message: 'Logged out successfully',
            }),
        });

        const { logoutUser } = await import('../src/api/auth');
        const result = await logoutUser();

        expect(global.fetch).toHaveBeenCalledWith(
            'http://localhost:5001/api/auth/logout',
            expect.objectContaining({
                method: 'POST',
                headers: expect.objectContaining({
                    Authorization: 'Bearer valid.jwt.token',
                }),
            })
        );

        expect(result.success).toBe(true);
        expect(result.message).toContain('Logged out');
        expect(localStorage.getItem('token')).toBeNull();
    });

//Token Clearance on Logout Failure:
    it('it should clear localStorage even if logout request fails', async () => {
        localStorage.setItem('token', 'valid.jwt.token');

        global.fetch.mockResolvedValueOnce({
            ok: false,
            status: 401,
            json: async () => ({
                success: false,
                message: 'Authorization header missing',
            }),
        });

        const { logoutUser } = await import('../src/api/auth');
        const result = await logoutUser();

        expect(result.success).toBe(false);
        expect(localStorage.getItem('token')).toBeNull();
    });

//TC-AM-07: Network Error Handling During Logout:
    it('TC-AM-07 → should handle network errors during logout', async () => {
        localStorage.setItem('token', 'valid.jwt.token');

        global.fetch.mockRejectedValueOnce(
            new Error('Network error: Failed to connect to server')
        );

        const { logoutUser } = await import('../src/api/auth');
        const result = await logoutUser();

        expect(result.success).toBe(false);
        expect(result.message).toContain('Network error');
        expect(localStorage.getItem('token')).toBeNull();
    });

//TC-AM-08: Logout Response Format:
    it('TC-AM-08 → should return properly formatted logout response', async () => {
        localStorage.setItem('token', 'valid.jwt.token');

        global.fetch.mockResolvedValueOnce({
            ok: true,
            json: async () => ({
                success: true,
                message: 'Logged out successfully',
            }),
        });

        const { logoutUser } = await import('../src/api/auth');
        const result = await logoutUser();

        expect(result).toHaveProperty('success');
        expect(result).toHaveProperty('message');
        expect(typeof result.success).toBe('boolean');
        expect(typeof result.message).toBe('string');
    });

});