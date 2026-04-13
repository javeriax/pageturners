// used by both Dashboard and book details to handle navigation to book details upon clicking a book card
import { useNavigate } from 'react-router-dom';
import React from 'react';
const BookCard = ({ book }) => {
    const navigate = useNavigate();

    return (
        <div className="book-card" onClick={() => navigate(`/book/${book._id}`)}>
            <img src={book.cover_image} alt={book.title} />
            <h3>{book.title}</h3>
            <p>{book.author_name}</p>
        </div>
    );
}; export default BookCard;