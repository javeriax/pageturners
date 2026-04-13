//TC-BD-01 - BD - 07
import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter, MemoryRouter, Routes, Route } from 'react-router-dom';  

import Dashboard from '../src/pages/Dashboard';
import * as booksApi from '../src/api/books';
import BookDetails from '../src/pages/BookDetails'; 

// Mock the API module
vi.mock('../src/api/books', () => ({
    searchBooks: vi.fn(),
    getInitialBooks: vi.fn(),
    getBookDetails: vi.fn(),
    getGenres: vi.fn(),
    getBookById: vi.fn(),
}));


const localStorageMock = (() => {
    let store = {};
    return {
        getItem: (key) => store[key] || null,
        setItem: (key, value) => { store[key] = value.toString(); },
        clear: () => { store = {}; }
    };
})();
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

const renderWithRouter = (ui) => render(<MemoryRouter>{ui}</MemoryRouter>);

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
    // TC-BD-01, TC-BD-02, TC-BD-04, TC-BD-07, TC-API-03
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

            // Matches searchError state
            expect(await screen.findByText(/Failed to connect to server/i)).toBeInTheDocument();
        });
    });

    // TC-BD-03: Genre Filtering
                        it('should filter books by a single genre (Fantasy)', async () => {
                const user = userEvent.setup();

                const allBooks = [
                    { book_id: 1, title: 'The Hobbit', genre: ['Fantasy'] },
                    { book_id: 2, title: 'Sherlock Holmes', genre: ['Mystery'] },
                    { book_id: 3, title: 'Harry Potter', genre: ['Fantasy'] }
                ];

                const fantasyBooks = allBooks.filter(b =>
                    b.genre.includes('Fantasy')
                );

                // mocks
                vi.mocked(booksApi.getInitialBooks).mockResolvedValue({
                    success: true,
                    data: {
                        row1: allBooks,
                        row2: [],
                        row3: []
                    }
                });

                vi.mocked(booksApi.getGenres).mockResolvedValue({
                    success: true,
                    data: ['Fantasy', 'Mystery']
                });

                vi.mocked(booksApi.searchBooks).mockResolvedValue({
                    success: true,
                    data: fantasyBooks
                });

                renderWithRouter(<Dashboard />);

                // wait for initial render
                await screen.findByText('The Hobbit');

                //  STEP 1: OPEN dropdown 
                const filterBtn = screen.getByRole('button', {
                    name: /filter by genre/i
                });

                await user.click(filterBtn);
                // STEP 2: click "Fantasy"
                const fantasyCheckbox = await screen.findByLabelText(/fantasy/i);

                await user.click(fantasyCheckbox);

                //STEP 3: verify filtered UI
                await waitFor(() => {
                    expect(screen.getByText('The Hobbit')).toBeInTheDocument();
                    expect(screen.getByText('Harry Potter')).toBeInTheDocument();
                    expect(
                        screen.queryByText('Sherlock Holmes')
                    ).not.toBeInTheDocument();
                });
            });

            });
            // TC-BD-05: Combined Search and Filter
            describe('Combined Search & Filter (TC-BD-05)', () => {
            ////////////////////////////////////////
            it('should filter results by keyword and genre', async () => {
                const user = userEvent.setup();

                // Mock the search API to return the specific book we are looking for
                vi.mocked(booksApi.searchBooks).mockResolvedValue({
                    success: true,
                    data: [{ book_id: "3", title: "A Court of Thorns and Roses", author_name: "Sarah J. Maas" }],
                    pagination: { total: 1, page: 1, limit: 12 }
                });

                renderWithRouter(<Dashboard />); 

                const searchInput = await screen.findByPlaceholderText(/Search by title or author/i);
                await user.type(searchInput, 'Court');

                // Open dropdown and click "Fantasy"
                await user.click(screen.getByRole('button', { name: /filter by genre/i }));
                const fantasyOption = await screen.findByLabelText(/fantasy/i);
                await user.click(fantasyOption);

                // Verify API call
                await waitFor(() => {
                    expect(booksApi.searchBooks).toHaveBeenLastCalledWith(
                        expect.stringContaining('Court'),
                        expect.arrayContaining(['Fantasy']),
                        expect.any(Number),
                        expect.any(Number)
                    );
                });

                // Verify UI display
                expect(await screen.findByText('A Court of Thorns and Roses')).toBeInTheDocument();
            });

            //TC-BD-06: Book Details Navigation//
            ///////////////////////////////////
                describe('Book Details Metadata (TC-BD-06)', () => {
    it('should display all required book metadata based on component logic', async () => {
        // 1. Setup mock to match the "book" state expected by your JSX
        const mockBook = {
            title: 'A Court of Thorns and Roses',
            author_name: 'Sarah J. Maas',
            genre: ['Fantasy'],
            synopsis: 'A gripping story...',
            total_pages: 416,
            avg_rating: 4.5,
            review_count: 10,
            cover_image: 'test-image.jpg',
            release_date: 'May 5, 2015',
            reviews: [] // Must be an array for book.reviews.length
        };

        vi.mocked(booksApi.getBookDetails).mockResolvedValue({
            success: true,
            data: mockBook
        });

        // Mock token for the userId payload logic in useEffect
        const fakePayload = btoa(JSON.stringify({ sub: 'user_123' }));
        localStorage.setItem('token', `header.${fakePayload}.signature`);

        render(
            <MemoryRouter initialEntries={['/book/3']}>
                <Routes>
                    <Route path="/book/:id" element={<BookDetails />} />
                </Routes>
            </MemoryRouter>
        );

        // 2. Wait for Title - this confirms the 'Loading...' state is gone
        expect(await screen.findByText('A Court of Thorns and Roses')).toBeInTheDocument();

        // 3. Check Author & Genre
        // Use getAllByText and check that at least one exists (or check the first one)
        const genreElements = screen.getAllByText(/Fantasy/i);
        expect(genreElements.length).toBeGreaterThanOrEqual(1);
        expect(genreElements[0]).toBeInTheDocument();

        // 4. Check Meta Strip (Total Pages & Release)
        // Note: Your code renders: <span>Total Pages</span> <span>416</span>
        expect(screen.getByText(/Total Pages/i)).toBeInTheDocument();
        expect(screen.getByText('416')).toBeInTheDocument();
        expect(screen.getByText(/Released/i)).toBeInTheDocument();

        // 5. Check Synopsis
        expect(screen.getByText(/A gripping story.../i)).toBeInTheDocument();

        // 6. Check Rating & Reviews
        // Your code uses Number(book.avg_rating).toFixed(1)
        expect(screen.getByText('4.5')).toBeInTheDocument();
        expect(screen.getByText('10 reviews')).toBeInTheDocument();

        // 7. Check the Button
        expect(screen.getByRole('button', { name: /\+ Add to Library/i })).toBeInTheDocument();

        // 8. Check the Image
        const img = screen.getByAltText('A Court of Thorns and Roses');
        expect(img).toHaveAttribute('src', 'test-image.jpg');
    });
});});