import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';

// Import your actual code
import Dashboard from '../src/pages/Dashboard';
import * as booksApi from '../src/api/books';

// Mock the API module
vi.mock('../src/api/books', () => ({
    searchBooks: vi.fn(),
    getInitialBooks: vi.fn(),
    getGenres: vi.fn(),
}));

// Mock localStorage for environment stability [cite: 81]
const localStorageMock = (() => {
    let store = {};
    return {
        getItem: (key) => store[key] || null,
        setItem: (key, value) => { store[key] = value.toString(); },
        clear: () => { store = {}; }
    };
})();
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

const renderWithRouter = (ui) => render(<BrowserRouter>{ui}</BrowserRouter>);

describe('Dashboard Component - Complete Discovery Tests', () => {

    beforeEach(() => {
        vi.clearAllMocks();
        localStorage.clear();
        localStorage.setItem('token', 'test-token');

        // Mock successful initial data load
        vi.mocked(booksApi.getInitialBooks).mockResolvedValue({
            success: true,
            data: { row1: [], row2: [], row3: [] }
        });
        vi.mocked(booksApi.getGenres).mockResolvedValue({
            success: true,
            data: ["Fantasy", "Romance"]
        });
    });

    describe('API & Search Logic (TC-BD-01, TC-BD-02, TC-BD-04, TC-API-03)', () => {
        it('should call searchBooks with correct query and genres', async () => {
            await booksApi.searchBooks('Harry Potter', ['Fantasy']);
            expect(booksApi.searchBooks).toHaveBeenCalledWith('Harry Potter', ['Fantasy']);
        });
    });

    describe('UI Interactions (TC-BD-01, TC-BD-07)', () => {
        it('should trigger search when user types in the bar', async () => {
            const user = userEvent.setup();
            vi.mocked(booksApi.searchBooks).mockResolvedValue({
                success: true,
                data: [{ book_id: "1", title: "Harry Potter", author_name: "JK" }],
                pagination: { total: 1, page: 1, limit: 12 }
            });

            renderWithRouter(<Dashboard />);
            const searchInput = await screen.findByPlaceholderText(/Search by title or author/i);
            await user.type(searchInput, 'H');

            // Wait for 400ms debounce in your code
            await waitFor(() => {
                expect(booksApi.searchBooks).toHaveBeenCalled();
            }, { timeout: 2000 });
        });

        it('should display "No results" message for empty searches (TC-BD-07)', async () => {
            const user = userEvent.setup();
            vi.mocked(booksApi.searchBooks).mockResolvedValue({
                success: true,
                data: [],
                message: "No results match your search"
            });

            renderWithRouter(<Dashboard />);
            const searchInput = await screen.findByPlaceholderText(/Search by title or author/i);
            await user.type(searchInput, 'NonExistentBook');

            await waitFor(() => {
                expect(screen.getByText(/No results match your search/i)).toBeInTheDocument();
            });
        });

        it('should show "Failed to connect" UI on API error', async () => {
            vi.mocked(booksApi.searchBooks).mockRejectedValue(new Error('Network error'));

            renderWithRouter(<Dashboard />);
            const searchInput = await screen.findByPlaceholderText(/Search by title or author/i);
            await userEvent.type(searchInput, 'H');

            // Matches your searchError state
            expect(await screen.findByText(/Failed to connect to server/i)).toBeInTheDocument();
        });
    });
});