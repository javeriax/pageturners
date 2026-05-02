import React, { useState } from 'react';
import { updateProgress } from '../api/library';

const ReadingProgress = ({ book, onUpdate }) => {
    // initialize state: ensure current_page is a string for the input field
    const [currentPage, setCurrentPage] = useState(
        book.current_page != null ? String(book.current_page) : ''
    );
    const [status, setStatus] = useState({ error: '', loading: false });

    const totalPages = book.total_pages || 0;
    const progressPercent = totalPages > 0 
        ? (Number(currentPage) / totalPages) * 100 
        : 0;
    // handle save progress:
    const handleSave = async () => {
        if (status.loading) return;

        const pageNum = Number(currentPage);
        
        // validation logic
        if (currentPage === '' || isNaN(pageNum) || pageNum < 0 || pageNum > totalPages) {
            setStatus({ error: "Enter a valid page number", loading: false });
            return;
        }

        setStatus({ error: '', loading: true });

        try {
            const result = await updateProgress(book._id, pageNum);

            if (result.success) {
                onUpdate(book._id, pageNum);
                setStatus({ error: "Saved progress!", loading: false });
                setTimeout(() => setStatus(prev => ({ ...prev, error: '' })), 2000);
            } else {
                setStatus({ error: result.message, loading: false });
            }
        } catch (err) {
            setStatus({ error: "Failed to connect", loading: false });
        }
    };

    // handle input change: allow only numbers and empty string for clearing the input
    const handleInputChange = (e) => {
        const value = e.target.value;
        
        // allow empty string so user can clear the input
        if (value === '') {
            setCurrentPage('');
            return;
        }

        const num = Number(value);
        // only update if it is a valid number
        if (!isNaN(num)) {
            setCurrentPage(value);
        }
    };

    return (
        <div className="reading-progress-container">
            <p className="progress-label">Reading progress:</p>
            
            <div className="progress-bar-background">
                <div 
                    className="progress-bar-fill" 
                    style={{ width: `${Math.min(Math.max(progressPercent, 0), 100)}%` }}
                />
            </div>

            <div className="progress-controls">
                <span>Page </span>
                <input 
                    type="number" 
                    className="page-input"
                    value={currentPage}
                    min="0"
                    max={totalPages}
                    onChange={handleInputChange}
                />
                <span className="total-pages"> / {totalPages}</span>
                
                <button 
                    className="save-progress-btn" 
                    onClick={handleSave}
                    disabled={status.loading}
                >
                    {status.loading ? '...' : 'Save Progress'}
                </button>
            </div>

            {status.error && (
                <p className={`progress-status ${status.error.includes('Saved') ? 'success' : 'error'}`}>
                    {status.error}
                </p>
            )}
        </div>
    );
};

export default ReadingProgress;