// Used by Dashboard and BookDetails to display book card with consistent image sizing
// Images are constrained to fixed dimensions with object-fit: cover for uniform appearance

import { useNavigate } from 'react-router-dom';
import React from 'react';

const BookCard = ({ book }) => {
    const navigate = useNavigate();

    return (
        <div className="book-card" onClick={() => navigate(`/book/${book._id}`)}>
            {/* Fixed-size cover wrapper ensures all images same dimensions (155px x 232px) */}
            <div className="book-cover-wrapper">
                {book.cover_image ? (
                    <img 
                        src={book.cover_image} 
                        alt={book.title}
                        className="book-cover"
                    />
                ) : (
                    <div className="book-cover-placeholder">
                        <div className="placeholder-icon">📖</div>
                        <div className="placeholder-text">No Cover</div>
                    </div>
                )}
            </div>
            
            {/* Book info section with fixed height (90px) - prevents title/author overflow */}
            <div className="book-info">
                <h3 className="book-title">{book.title}</h3>
                <p className="book-author">{book.author_name}</p>
            </div>
        </div>
    );
};

export default BookCard;
