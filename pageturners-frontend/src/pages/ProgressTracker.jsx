import React, { useState } from 'react';
import { updateProgress } from '../api/library'; 

const ReadingProgress = ({ book, onUpdate }) => {
    //Internal state for the input field
    const [currentPage, setCurrentPage] = useState(
    book.current_page !== undefined && book.current_page !== null
        ? String(book.current_page)
        : ''
);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    // Calculate progress percentage for the bar
    const totalPages = book.total_pages || 0;
    const CurrentPage = Number(currentPage) || 0;
    const progressPercent =
        totalPages > 0 ? (CurrentPage / totalPages) * 100 : 0;

    // Handle saving progress to backend (upon pressing "Save" button)
    const handleSave = async () => {
        if (loading) return; // Prevent multiple clicks
        const pageNum = Number(currentPage);
       if (currentPage === '' || isNaN(pageNum) || pageNum < 0 || pageNum > totalPages) {
            setError("Enter a valid page number");
            return;
        }

    //  UI FEEDBACK 
        setError("Saved progress!"); // Show success message
        setTimeout(() => setError(''), 2000);

        setLoading(true); // Show loading state on button

        try {
            const result = await updateProgress(book._id, pageNum);

            if (result.success) {
                onUpdate(book._id, pageNum); 
            } else {
                setError(result.message);
            }
        } catch (err) {
            setError("Failed to connect");
        } finally {
            setLoading(false);
        }
};
    return (
        <div className="reading-progress-container">
            <p className="progress-label">Reading progress:</p>
            
            {/* Progress Bar */}
            <div className="progress-bar-background">
                <div 
                    className="progress-bar-fill" 
                    style={{ width: `${Math.min(progressPercent, 100)}%` }}
                ></div>
            </div>

            <div className="progress-controls">
                <span>Page </span>
                {/*Input Field */}
                <input 
                    type="number" 
                    className="page-input"
                    value={currentPage}
                    min="0"
                    max={totalPages}
                    onChange={(e) => {
                        const value = e.target.value; // Allow empty input to clear the field
                        if (value === '') { // Clear input if user deletes the value
                            setCurrentPage(''); // Set to empty string to allow user to have a blank input before entering a new number
                            return;
                        }
                        // Validate that the input is a number and within the valid range
                        const num = Number(value);
                        // Only update state if it's a valid number and within the range
                        if (!Number.isNaN(num)) {
                            setCurrentPage(num);
                        }
}}
                                />
                {/* Show total pages next to input */}
                <span className="total-pages"> / {totalPages}</span>
                {/* Save Button*/}
                <button 
                    className="save-progress-btn" 
                    onClick={handleSave}
                    disabled={loading}
                >
                    {loading ? '...' : 'Save Progress'}
                </button>
            </div>

            {error && <p className="progress-error">{error}</p>}
        </div>
    );
};

export default ReadingProgress;