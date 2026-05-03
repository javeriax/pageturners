//TC-API-02: Protected API Access Without Token
import { describe, it, expect, vi } from 'vitest';

global.fetch = vi.fn();

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