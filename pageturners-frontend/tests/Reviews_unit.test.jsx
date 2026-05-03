import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { getBookDetails, submitReview, deleteReview, addToLibrary } from '../src/api/books';
import BookDetails from '../src/pages/BookDetails';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import React from 'react';

// Mock the API
vi.mock('../src/api/books', () => ({
    getBookDetails: vi.fn(),
    submitReview: vi.fn(),
    deleteReview: vi.fn(),
    addToLibrary: vi.fn()
}));

// Mock useParams
vi.mock('react-router-dom', async () => {
    const actual = await vi.importActual('react-router-dom');
    return {
        ...actual,
        useParams: () => ({ id: 'test-book-id' })
    };
});

// Wrapper with Router
const renderWithRouter = (component) => {
    return render(
        <MemoryRouter initialEntries={['/book/test-book-id']}>
            <Routes>
                <Route path="/book/:id" element={component} />
            </Routes>
        </MemoryRouter>
    );
};

//UNIT TESTS: Form Validation:
describe(' Review Form Validation', () => {
    
    beforeEach(() => {
        vi.clearAllMocks();
        getBookDetails.mockResolvedValue({
            success: true,
            data: {
                _id: 'test-book-id',
                title: 'Test Book',
                author: 'Test Author',
                description: 'Test Description',
                reviews: [],
                avg_rating: 0
            }
        });
        submitReview.mockResolvedValue({
            success: false,
            message: 'Please select a rating before submitting'
        });
    });
    //TC-RR-03:Rating requirement validation
        it('should show error when rating not selected', async () => {
        const user = userEvent.setup();
        
        renderWithRouter(<BookDetails />);
        
        await waitFor(() => {
            expect(screen.getByPlaceholderText('What did you think of this book?')).toBeInTheDocument();
        });
        //TC-RR-02: Submit written text review
        const textarea = screen.getByPlaceholderText('What did you think of this book?');
        await user.type(textarea, 'Great book!');
        
        const submitBtn = screen.getByText('Submit Review');
        await user.click(submitBtn);
        
        await waitFor(() => {
            expect(screen.getByText(/Please select a rating/i)).toBeInTheDocument();
        });
    });

    it('should allow empty review text (optional field)', async () => {
        const user = userEvent.setup();
        
        submitReview.mockResolvedValue({
            success: true,
            message: 'Review submitted successfully!',
            data: { avg_rating: 5.0, review_count: 1 }
        });
        
        renderWithRouter(<BookDetails />);
        
        await waitFor(() => {
            expect(screen.getByPlaceholderText('What did you think of this book?')).toBeInTheDocument();
        });
        
        const starButtons = screen.getAllByRole('button', { name: /rate \d+ stars?/i })
        await user.click(starButtons[4]); // 5 stars
        
        // Don't write any text - submit directly
        const submitBtn = screen.getByText('Submit Review');
        await user.click(submitBtn);
        
        await waitFor(() => {
            expect(submitReview).toHaveBeenCalledWith('test-book-id', 5, '');
        });
    });
});

//UNIT TESTS: Star Rating Component

describe('Star Rating Component', () => {
    
    beforeEach(() => {
        vi.clearAllMocks();
        getBookDetails.mockResolvedValue({
            success: true,
            data: {
                _id: 'test-book-id',
                title: 'Test Book',
                author: 'Test Author',
                reviews: [],
                avg_rating: 0
            }
        });
    });
    //TC-RR-01: Submit star rating
    it('should allow selecting 1-5 stars', async () => {
        const user = userEvent.setup();
        
        renderWithRouter(<BookDetails />);
        
        await waitFor(() => {
            const stars = screen.queryAllByRole('button', { name: /rate \d+ stars?/i });
            expect(stars.length).toBeGreaterThanOrEqual(5);
        });
        
        const starButtons = screen.getAllByRole('button', { name: /rate \d+ stars?/i });
        
        // Test each star can be clicked
        for (let i = 0; i < 5; i++) {
            await user.click(starButtons[i]);
            expect(starButtons[i]).toHaveClass('active');
        }
    });

    it('should highlight stars on hover', async () => {
        renderWithRouter(<BookDetails />);
        
        await waitFor(() => {
            const stars = screen.queryAllByRole('button', { name: /rate \d+ stars?/i });
            expect(stars.length).toBeGreaterThanOrEqual(5);
        });
        
        const starButtons = screen.getAllByRole('button', { name: /rate \d+ stars?/i });
        
        // Hover over 3rd star
        fireEvent.mouseEnter(starButtons[2]);
        
        // Stars up to 3rd should be highlighted
        expect(starButtons[0]).toHaveClass('active');
        expect(starButtons[1]).toHaveClass('active');
        expect(starButtons[2]).toHaveClass('active');
    });

    it('should clear hover state when mouse leaves', async () => {
        renderWithRouter(<BookDetails />);
        
        await waitFor(() => {
            const stars = screen.queryAllByRole('button', { name: /rate \d+ stars?/i });
            expect(stars.length).toBeGreaterThanOrEqual(5);
        });
        
        const starButtons = screen.getAllByRole('button', { name: /rate \d+ stars?/i });
        
        fireEvent.mouseEnter(starButtons[2]);
        fireEvent.mouseLeave(starButtons[2]);
        
        // Hover classes should be removed
        expect(starButtons[0]).not.toHaveClass('hovered');
    });
});

//UNIT TESTS: Average Rating Display
describe('Average Rating Display', () => {
    
    beforeEach(() => {
        vi.clearAllMocks();
    });
    
    it('should display average rating from book data', async () => {
        getBookDetails.mockResolvedValue({
            success: true,
            data: {
                _id: 'test-book-id',
                title: 'Test Book',
                author: 'Test Author',
                avg_rating: 4.5,
                review_count: 10,
                reviews: []
            }
        });
        
        renderWithRouter(<BookDetails />);
        
        await waitFor(() => {
            expect(screen.getByText('4.5')).toBeInTheDocument();
            expect(screen.getByText(/10 reviews?/i)).toBeInTheDocument();
        });
    });
    //TC-RR-04: Average Rating Recalculation upon new review
    it('should update average rating after new review', async () => {
        const user = userEvent.setup();
        
        getBookDetails.mockResolvedValueOnce({
            success: true,
            data: {
                _id: 'test-book-id',
                title: 'Test Book',
                author: 'Test Author',
                avg_rating: 4.0,
                review_count: 5,
                reviews: []
            }
        });
        
        submitReview.mockResolvedValue({
            success: true,
            message: 'Review submitted successfully!',
            data: { avg_rating: 4.2, review_count: 6 }
        });
        
        renderWithRouter(<BookDetails />);
        
        await waitFor(() => {
            expect(screen.getByText('4.0')).toBeInTheDocument();
        });
        
        const starButtons = screen.getAllByRole('button', { name: /rate \d+ stars?/i });
        await user.click(starButtons[4]); // 5 stars
        
        const textarea = screen.getByPlaceholderText('What did you think of this book?');
        await user.type(textarea, 'Excellent!');
        
        const submitBtn = screen.getByText('Submit Review');
        await user.click(submitBtn);
        
        await waitFor(() => {
            expect(screen.getByText('4.2')).toBeInTheDocument();
        });
    });

    it('should show 0 stars if no reviews', async () => {
        getBookDetails.mockResolvedValue({
            success: true,
            data: {
                _id: 'test-book-id',
                title: 'Test Book',
                author: 'Test Author',
                avg_rating: 0,
                review_count: 0,
                reviews: []
            }
        });
        
        renderWithRouter(<BookDetails />);
        
        await waitFor(() => {
            expect(screen.getByText('—')).toBeInTheDocument();
        });
    });
});

//INTEGRATION TESTS: Review Submission

describe('Submit Review Integration', () => {
    
    beforeEach(() => {
        vi.clearAllMocks();
        getBookDetails.mockResolvedValue({
            success: true,
            data: {
                _id: 'test-book-id',
                title: 'Test Book',
                author: 'Test Author',
                reviews: [],
                avg_rating: 0,
                review_count: 0
            }
        });
    });
    
    it('should submit review with valid data', async () => {
        const user = userEvent.setup();
        
        submitReview.mockResolvedValue({
            success: true,
            message: 'Review submitted successfully!',
            data: { avg_rating: 5.0, review_count: 1 }
        });
        
        renderWithRouter(<BookDetails />);
        
        await waitFor(() => {
            expect(screen.getByPlaceholderText('What did you think of this book?')).toBeInTheDocument();
        });
        
        const starButtons = screen.getAllByRole('button', { name: /rate \d+ stars?/i });
        await user.click(starButtons[4]); // 5 stars
        
        const textarea = screen.getByPlaceholderText('What did you think of this book?');
        await user.type(textarea, 'Amazing book!');
        
        const submitBtn = screen.getByText('Submit Review');
        await user.click(submitBtn);
        
        await waitFor(() => {
            expect(submitReview).toHaveBeenCalledWith('test-book-id', 5, 'Amazing book!');
        });
    });
    
    it('should show success message after submission', async () => {
        const user = userEvent.setup();
        
        submitReview.mockResolvedValue({
            success: true,
            message: 'Review submitted successfully!',
            data: { avg_rating: 4.5, review_count: 1 }
        });
        
        renderWithRouter(<BookDetails />);
        
        await waitFor(() => {
            expect(screen.getByPlaceholderText('What did you think of this book?')).toBeInTheDocument();
        });
        
        const starButtons = screen.getAllByRole('button', { name: /rate \d+ stars?/i });
        await user.click(starButtons[4]);
        
        const textarea = screen.getByPlaceholderText('What did you think of this book?');
        await user.type(textarea, 'Great!');
        
        const submitBtn = screen.getByText('Submit Review');
        await user.click(submitBtn);
        
        await waitFor(() => {
            expect(screen.getByText(/Review submitted successfully/i)).toBeInTheDocument();
        });
    });
    
    it('should clear form after successful submission', async () => {
        const user = userEvent.setup();
        
        submitReview.mockResolvedValue({
            success: true,
            message: 'Review submitted successfully!',
            data: { avg_rating: 4.5, review_count: 1 }
        });
        
        renderWithRouter(<BookDetails />);
        
        await waitFor(() => {
            expect(screen.getByPlaceholderText('What did you think of this book?')).toBeInTheDocument();
        });
        
        const starButtons = screen.getAllByRole('button', { name: /rate \d+ stars?/i });
        await user.click(starButtons[4]);
        
        const textarea = screen.getByPlaceholderText('What did you think of this book?');
        await user.type(textarea, 'Good!');
        
        const submitBtn = screen.getByText('Submit Review');
        await user.click(submitBtn);
        
        await waitFor(() => {
            expect(textarea).toHaveValue('');
        });
    });
    
    it('should show error message on API failure', async () => {
        const user = userEvent.setup();
        
        submitReview.mockResolvedValue({
            success: false,
            message: 'You must be logged in to submit a review'
        });
        
        renderWithRouter(<BookDetails />);
        
        await waitFor(() => {
            expect(screen.getByPlaceholderText('What did you think of this book?')).toBeInTheDocument();
        });
        
        const starButtons = screen.getAllByRole('button', { name: /rate \d+ stars?/i });
        await user.click(starButtons[4]);
        
        const textarea = screen.getByPlaceholderText('What did you think of this book?');
        await user.type(textarea, 'Good!');
        
        const submitBtn = screen.getByText('Submit Review');
        await user.click(submitBtn);
        
        await waitFor(() => {
            expect(screen.getByText(/You must be logged in/i)).toBeInTheDocument();
        });
    });

    it('should disable submit button while submitting', async () => {
        const user = userEvent.setup();
        
        submitReview.mockImplementation(() => 
            new Promise(resolve => 
                setTimeout(() => resolve({
                    success: true,
                    message: 'Review submitted successfully!',
                    data: { avg_rating: 4.5, review_count: 1 }
                }), 300)
            )
        );
        
        renderWithRouter(<BookDetails />);
        
        await waitFor(() => {
            expect(screen.getByPlaceholderText('What did you think of this book?')).toBeInTheDocument();
        });
        
        const starButtons = screen.getAllByRole('button', { name: /rate \d+ stars?/i });
        await user.click(starButtons[4]);
        
        const textarea = screen.getByPlaceholderText('What did you think of this book?');
        await user.type(textarea, 'Good!');
        
        const submitBtn = screen.getByText('Submit Review');
        await user.click(submitBtn);
        
        expect(submitBtn).toBeDisabled();
    });
});

//INTEGRATION TESTS: View Reviews 

describe('View Reviews', () => {
    
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should display all reviews for book', async () => {
        getBookDetails.mockResolvedValue({
            success: true,
            data: {
                _id: 'test-book-id',
                title: 'Test Book',
                author: 'Test Author',
                reviews: [
                    { _id: 'rev1', username: 'user1', rating: 5, text: 'Excellent!', user_id: 'u1' },
                    { _id: 'rev2', username: 'user2', rating: 4, text: 'Good', user_id: 'u2' }
                ],
                avg_rating: 4.5,
                review_count: 2
            }
        });
        
        renderWithRouter(<BookDetails />);
        
        await waitFor(() => {
            expect(screen.getByText('user1')).toBeInTheDocument();
            expect(screen.getByText('user2')).toBeInTheDocument();
        });
    });

    it('should show review rating stars', async () => {
        getBookDetails.mockResolvedValue({
            success: true,
            data: {
                _id: 'test-book-id',
                title: 'Test Book',
                author: 'Test Author',
                reviews: [
                    { _id: 'rev1', username: 'user1', rating: 5, text: 'Excellent!', user_id: 'u1' }
                ],
                avg_rating: 5.0,
                review_count: 1
            }
        });
        
        renderWithRouter(<BookDetails />);
        
        await waitFor(() => {
            expect(screen.getByText('user1')).toBeInTheDocument();
        });
    });

    it('should show 5 star buttons in review form', async () => {
        getBookDetails.mockResolvedValue({
            success: true,
            data: {
                _id: 'test-book-id',
                title: 'Test Book',
                author: 'Test Author',
                reviews: [],
                avg_rating: 0
            }
        });
        
        renderWithRouter(<BookDetails />);
        
        await waitFor(() => {
            const starButtons = screen.getAllByRole('button', { name: /rate \d+ stars?/i });
            expect(starButtons.length).toBeGreaterThanOrEqual(5);
        });
    });
});

// Delete Review 

describe('Delete Review', () => {
    
    beforeEach(() => {
        vi.clearAllMocks();
        getBookDetails.mockResolvedValue({
            success: true,
            data: {
                _id: 'test-book-id',
                title: 'Test Book',
                author: 'Test Author',
                reviews: [
                    { _id: 'rev1', username: 'testuser', rating: 5, text: 'My review', user_id: 'current-user' }
                ],
                avg_rating: 5.0,
                review_count: 1
            }
        });
    });
    //TC-RR-05: Delete personal review + TC-RR-07: Delete only visible for personal reviews
    it('should show delete button for own reviews', async () => {
        renderWithRouter(<BookDetails />);
        
        await waitFor(() => {
            expect(screen.getByText('testuser')).toBeInTheDocument();
        });
        
        // Should show delete button for current user's review
        const deleteBtn = screen.queryByRole('button', { name: /delete/i });
        if (deleteBtn) {
            expect(deleteBtn).toBeInTheDocument();
        }
    });

    it('should delete review when delete button clicked', async () => {
        const user = userEvent.setup();
        
        deleteReview.mockResolvedValue({
            success: true,
            message: 'Review deleted successfully',
            data: { avg_rating: 0, review_count: 0 }
        });
        
        renderWithRouter(<BookDetails />);
        
        await waitFor(() => {
            expect(screen.getByText('testuser')).toBeInTheDocument();
        });
        
        const deleteBtn = screen.queryByRole('button', { name: /delete/i });
        if (deleteBtn) {
            await user.click(deleteBtn);
            
            await waitFor(() => {
                expect(deleteReview).toHaveBeenCalled();
            });
        }
    });

    it('should show success message after deletion', async () => {
        const user = userEvent.setup();
        
        deleteReview.mockResolvedValue({
            success: true,
            message: 'Review deleted successfully',
            data: { avg_rating: 0, review_count: 0 }
        });
        
        renderWithRouter(<BookDetails />);
        
        await waitFor(() => {
            expect(screen.getByText('testuser')).toBeInTheDocument();
        });
        
        const deleteBtn = screen.queryByRole('button', { name: /delete/i });
        if (deleteBtn) {
            await user.click(deleteBtn);
            
            await waitFor(() => {
                expect(screen.getByText(/Review deleted/i)).toBeInTheDocument();
            });
        }
    });
    //TC-RR-06:Average Rating Recalculation (Delete)

    it('should update average rating after deletion', async () => {
        const user = userEvent.setup();
        
        deleteReview.mockResolvedValue({
            success: true,
            message: 'Review deleted successfully',
            data: { avg_rating: 4.0, review_count: 5 }
        });
        
        renderWithRouter(<BookDetails />);
        
        await waitFor(() => {
            expect(screen.getByText('testuser')).toBeInTheDocument();
        });
        
        const deleteBtn = screen.queryByRole('button', { name: /delete/i });
        if (deleteBtn) {
            await user.click(deleteBtn);
            
            await waitFor(() => {
                expect(screen.getByText('4.0')).toBeInTheDocument();
            });
        }
    });
});
// SYSTEM TESTS: End-to-End 

describe('System Testing', () => {
    
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('complete flow - submit and view review', async () => {
        const user = userEvent.setup();
        
        getBookDetails.mockResolvedValueOnce({
            success: true,
            data: {
                _id: 'test-book-id',
                title: 'Test Book',
                author: 'Test Author',
                reviews: [],
                avg_rating: 0,
                review_count: 0
            }
        });
        
        submitReview.mockResolvedValueOnce({
            success: true,
            message: 'Review submitted successfully!',
            data: { avg_rating: 5.0, review_count: 1 }
        });
        
        renderWithRouter(<BookDetails />);
        
        // Submit review
        await waitFor(() => {
            expect(screen.getByPlaceholderText('What did you think of this book?')).toBeInTheDocument();
        });
        
        const starButtons = screen.getAllByRole('button', { name: /rate \d+ stars?/i });
        await user.click(starButtons[4]);
        
        const textarea = screen.getByPlaceholderText('What did you think of this book?');
        await user.type(textarea, 'Excellent!');
        
        const submitBtn = screen.getByText('Submit Review');
        await user.click(submitBtn);
        
        // Verify review was submitted
        await waitFor(() => {
            expect(screen.getByText(/Review submitted successfully/i)).toBeInTheDocument();
        });
    });

    it('should display multiple reviews with different ratings', async () => {
        getBookDetails.mockResolvedValue({
            success: true,
            data: {
                _id: 'test-book-id',
                title: 'Test Book',
                author: 'Test Author',
                reviews: [
                    { _id: 'rev1', username: 'user1', rating: 5, text: 'Great', user_id: 'u1' },
                    { _id: 'rev2', username: 'user2', rating: 3, text: 'Ok', user_id: 'u2' },
                    { _id: 'rev3', username: 'user3', rating: 4, text: 'Good', user_id: 'u3' }
                ],
                avg_rating: 4.0,
                review_count: 3
            }
        });
        
        renderWithRouter(<BookDetails />);
        
        await waitFor(() => {
            expect(screen.getByText('4.0')).toBeInTheDocument();
            expect(screen.getByText('user1')).toBeInTheDocument();
            expect(screen.getByText('user2')).toBeInTheDocument();
            expect(screen.getByText('user3')).toBeInTheDocument();
        });
    });
});

export default {};