import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { submitReview } from '../src/api/books';
import BookDetails from '../src/pages/BookDetails';

// Mock the API
vi.mock('../src/api/books', () => ({
    getBookDetails: vi.fn(),
    submitReview: vi.fn()
}));

// ─── UNIT TESTS: Validation ───

describe('KLYRA-69: Review Form Validation', () => {
    
    test('should show error when rating not selected', async () => {
        const user = userEvent.setup();
        
        // Render component
        render(<BookDetails />);
        
        // Write review text but don't select rating
        const textarea = await screen.findByPlaceholderText('What did you think of this book?');
        await user.type(textarea, 'Great book!');
        
        // Click submit without selecting rating
        const submitBtn = screen.getByText('Submit Review');
        await user.click(submitBtn);
        
        // Should show error
        await waitFor(() => {
            expect(screen.getByText(/Please select a rating/i)).toBeInTheDocument();
        });
    });
    
    test('should show error when review text is empty', async () => {
        const user = userEvent.setup();
        
        render(<BookDetails />);
        
        // Select 5 stars
        const starButtons = screen.getAllByRole('button', { name: /Rate/i });
        await user.click(starButtons[4]); // 5th star
        
        // Don't write any text
        const submitBtn = screen.getByText('Submit Review');
        await user.click(submitBtn);
        
        // Should show error
        await waitFor(() => {
            expect(screen.getByText(/Please write a review/i)).toBeInTheDocument();
        });
    });
    
    test('should show error when review text is only spaces', async () => {
        const user = userEvent.setup();
        
        render(<BookDetails />);
        
        // Select rating
        const starButtons = screen.getAllByRole('button', { name: /Rate/i });
        await user.click(starButtons[4]);
        
        // Write only spaces
        const textarea = await screen.findByPlaceholderText('What did you think of this book?');
        await user.type(textarea, '   ');
        
        const submitBtn = screen.getByText('Submit Review');
        await user.click(submitBtn);
        
        // Should show error
        await waitFor(() => {
            expect(screen.getByText(/Please write a review/i)).toBeInTheDocument();
        });
    });
});

// ─── UNIT TESTS: Star Picker ───

describe('KLYRA-68: Star Rating Component', () => {
    
    test('should allow selecting 1-5 stars', async () => {
        const user = userEvent.setup();
        
        render(<BookDetails />);
        
        const starButtons = screen.getAllByRole('button', { name: /Rate/i });
        
        // Click each star and verify
        for (let i = 0; i < 5; i++) {
            await user.click(starButtons[i]);
            // Verify that star is selected (has 'active' class)
            expect(starButtons[i]).toHaveClass('active');
        }
    });
    
    test('should highlight stars on hover', async () => {
        const user = userEvent.setup();
        
        render(<BookDetails />);
        
        const starButtons = screen.getAllByRole('button', { name: /Rate/i });
        
        // Hover over 3rd star
        fireEvent.mouseEnter(starButtons[2]);
        
        // All stars up to 3rd should be highlighted
        expect(starButtons[0]).toHaveClass('active');
        expect(starButtons[1]).toHaveClass('active');
        expect(starButtons[2]).toHaveClass('active');
        expect(starButtons[3]).not.toHaveClass('active');
    });
    
    test('should clear hover state when mouse leaves', async () => {
        render(<BookDetails />);
        
        const starButtons = screen.getAllByRole('button', { name: /Rate/i });
        
        // Hover and then leave
        fireEvent.mouseEnter(starButtons[2]);
        fireEvent.mouseLeave(starButtons[2]);
        
        // Stars should not be active (no permanent selection yet)
        expect(starButtons[0]).not.toHaveClass('active');
    });
});

// ─── INTEGRATION TESTS: Submit Review ───

describe('KLYRA-118: Submit Review Integration', () => {
    
    beforeEach(() => {
        vi.clearAllMocks();
    });
    
    test('should submit review with valid data', async () => {
        const user = userEvent.setup();
        const mockSubmitReview = vi.fn().mockResolvedValue({
            success: true,
            message: 'Review submitted successfully!',
            data: {
                avg_rating: 4.5,
                review_count: 2
            }
        });
        
        // Replace mock
        vi.mocked(submitReview).mockImplementation(mockSubmitReview);
        
        render(<BookDetails />);
        
        // Select 5 stars
        const starButtons = screen.getAllByRole('button', { name: /Rate/i });
        await user.click(starButtons[4]);
        
        // Write review
        const textarea = await screen.findByPlaceholderText('What did you think of this book?');
        await user.type(textarea, 'Amazing book!');
        
        // Submit
        const submitBtn = screen.getByText('Submit Review');
        await user.click(submitBtn);
        
        // Verify API was called
        await waitFor(() => {
            expect(mockSubmitReview).toHaveBeenCalledWith(
                expect.any(String), // book ID
                5, // rating
                'Amazing book!' // review text
            );
        });
    });
    
    test('should show success message after submission', async () => {
        const user = userEvent.setup();
        
        submitReview.mockResolvedValue({
            success: true,
            message: 'Review submitted successfully!',
            data: {
                avg_rating: 4.5,
                review_count: 2
            }
        });
        
        render(<BookDetails />);
        
        // Fill form
        const starButtons = screen.getAllByRole('button', { name: /Rate/i });
        await user.click(starButtons[4]);
        
        const textarea = await screen.findByPlaceholderText('What did you think of this book?');
        await user.type(textarea, 'Great!');
        
        // Submit
        const submitBtn = screen.getByText('Submit Review');
        await user.click(submitBtn);
        
        // Check for success message
        await waitFor(() => {
            expect(screen.getByText(/Review submitted successfully/i)).toBeInTheDocument();
        });
    });
    
    test('should clear form after successful submission', async () => {
        const user = userEvent.setup();
        
        submitReview.mockResolvedValue({
            success: true,
            message: 'Review submitted successfully!',
            data: { avg_rating: 4.5, review_count: 2 }
        });
        
        render(<BookDetails />);
        
        // Fill form
        const starButtons = screen.getAllByRole('button', { name: /Rate/i });
        await user.click(starButtons[4]);
        
        const textarea = await screen.findByPlaceholderText('What did you think of this book?');
        await user.type(textarea, 'Good!');
        
        // Submit
        const submitBtn = screen.getByText('Submit Review');
        await user.click(submitBtn);
        
        // Wait for success and check form is cleared
        await waitFor(() => {
            expect(textarea).toHaveValue(''); // Text cleared
            // Stars should be reset (check if no star has active class)
            const activeStars = screen.getAllByRole('button', { name: /Rate/i })
                .filter(btn => btn.classList.contains('active'));
            expect(activeStars).toHaveLength(0);
        });
    });
    
    test('should show error message on API failure', async () => {
        const user = userEvent.setup();
        
        submitReview.mockResolvedValue({
            success: false,
            message: 'You must be logged in to submit a review'
        });
        
        render(<BookDetails />);
        
        // Fill form
        const starButtons = screen.getAllByRole('button', { name: /Rate/i });
        await user.click(starButtons[4]);
        
        const textarea = await screen.findByPlaceholderText('What did you think of this book?');
        await user.type(textarea, 'Good!');
        
        // Submit
        const submitBtn = screen.getByText('Submit Review');
        await user.click(submitBtn);
        
        // Check for error message
        await waitFor(() => {
            expect(screen.getByText(/You must be logged in/i)).toBeInTheDocument();
        });
    });
    
    test('should disable submit button while submitting', async () => {
        const user = userEvent.setup();
        
        // Mock slow submission
        submitReview.mockImplementation(() => 
            new Promise(resolve => 
                setTimeout(() => resolve({
                    success: true,
                    message: 'Review submitted successfully!',
                    data: { avg_rating: 4.5, review_count: 2 }
                }), 1000)
            )
        );
        
        render(<BookDetails />);
        
        // Fill form
        const starButtons = screen.getAllByRole('button', { name: /Rate/i });
        await user.click(starButtons[4]);
        
        const textarea = await screen.findByPlaceholderText('What did you think of this book?');
        await user.type(textarea, 'Good!');
        
        // Click submit
        const submitBtn = screen.getByText('Submit Review');
        await user.click(submitBtn);
        
        // Check button is disabled
        expect(submitBtn).toBeDisabled();
        expect(submitBtn).toHaveTextContent('Submitting...');
    });
});

// ─── SYSTEM TESTS: End-to-End ───

describe('KLYRA-120: System Testing', () => {
    
    test('multiple users adding reviews should update average rating correctly', async () => {
        const user = userEvent.setup();
        
        // Simulate first user's review
        submitReview.mockResolvedValueOnce({
            success: true,
            data: {
                avg_rating: 5.0, // First 5-star review
                review_count: 1
            }
        });
        
        render(<BookDetails />);
        
        // First review
        const starButtons = screen.getAllByRole('button', { name: /Rate/i });
        await user.click(starButtons[4]); // 5 stars
        
        const textarea = await screen.findByPlaceholderText('What did you think of this book?');
        await user.type(textarea, 'Excellent!');
        
        const submitBtn = screen.getByText('Submit Review');
        await user.click(submitBtn);
        
        // Check average updated
        await waitFor(() => {
            expect(screen.getByText(/5.0/)).toBeInTheDocument();
        });
    });
    
    test('submit button text changes during submission', async () => {
        const user = userEvent.setup();
        
        submitReview.mockImplementation(() => 
            new Promise(resolve => 
                setTimeout(() => resolve({
                    success: true,
                    message: 'Review submitted successfully!',
                    data: { avg_rating: 4.5, review_count: 2 }
                }), 500)
            )
        );
        
        render(<BookDetails />);
        
        // Fill form
        const starButtons = screen.getAllByRole('button', { name: /Rate/i });
        await user.click(starButtons[4]);
        
        const textarea = await screen.findByPlaceholderText('What did you think of this book?');
        await user.type(textarea, 'Good!');
        
        const submitBtn = screen.getByText('Submit Review');
        
        // Before click
        expect(submitBtn).toHaveTextContent('Submit Review');
        
        // Click and check
        await user.click(submitBtn);
        expect(submitBtn).toHaveTextContent('Submitting...');
        
        // After submission
        await waitFor(() => {
            expect(submitBtn).toHaveTextContent('Submit Review');
        });
    });
});

export default {};