// UC3,10 - Dashboard: featured books and search/discovery interface
// shows 3 featured rows + real-time search with multi-select genre filtering
// featured rows: Popular Picks (most reviewed), New Arrivals (newest), More to Explore (random)

import React from 'react';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { searchBooks, getInitialBooks, getGenres } from '../api/dashboard';
import '../styles/Dashboard.css';
import BookCard from '../components/BookCard';

export default function Dashboard() {
    const navigate = useNavigate();

    // search and filter state
    const [searchQuery, setSearchQuery] = useState('');
    const [genreSearch, setGenreSearch] = useState('');
    const [selectedGenres, setSelectedGenres] = useState([]);
    const [availableGenres, setAvailableGenres] = useState([]);
    const [filterOpen, setFilterOpen] = useState(false);

    // featured books and search results
    const [featuredBooks, setFeaturedBooks] = useState({});
    const [searchResults, setSearchResults] = useState([]);

    // pagination info for search results
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalResults, setTotalResults] = useState(0);

    // track if user is searching or just viewing featured
    const [isSearchMode, setIsSearchMode] = useState(false);

    // loading and error states
    const [loadingFeatured, setLoadingFeatured] = useState(true);
    const [loadingSearch, setLoadingSearch] = useState(false);
    const [featuredError, setFeaturedError] = useState('');
    const [searchError, setSearchError] = useState('');

    // refs for keyboard navigation and dropdown positioning
    const filterRef = useRef(null);
    const genreSearchRef = useRef(null);

    const BOOKS_PER_PAGE = 12;
    const FEATURED_ROW_COUNT = 3;
    const BOOKS_PER_ROW = 20;


    // check if user is logged in - redirect to login if no token
    useEffect(() => {
        const token = localStorage.getItem('token');
        if (!token) navigate('/login');
    }, [navigate]);

    // load featured books and genres when component mounts
    useEffect(() => {
        loadInitialBooks();
        loadGenres();
    }, []);

    // auto-focus genre search input when dropdown opens
    useEffect(() => {
        if (filterOpen && genreSearchRef.current) {
            setTimeout(() => genreSearchRef.current?.focus(), 50);
        }
        if (!filterOpen) {
            // clear genre search text when dropdown closes so it starts fresh next time
            setGenreSearch('');
        }
    }, [filterOpen]);

    // close dropdown when user clicks outside of it (click outside detection)
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (filterRef.current && !filterRef.current.contains(e.target)) {
                setFilterOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // fetch and load the 3 featured rows of books (Popular, New Arrivals, Random)
    const loadInitialBooks = async () => {
        setLoadingFeatured(true);
        setFeaturedError('');
        try {
            const result = await getInitialBooks();
            if (result.success) {
                setFeaturedBooks(result.data);
            } else {
                setFeaturedError('Failed to load books');
            }
        } catch (err) {
            setFeaturedError('Failed to load books');
        } finally {
            setLoadingFeatured(false);
        }
    };

    // fetch all available genres for the filter dropdown
    const loadGenres = async () => {
        const result = await getGenres();
        if (result.success) setAvailableGenres(result.data);
    };

    // fetch search/filter results based on query, genres, and page number
    const loadSearchResults = useCallback(async (query, genres, page) => {
        setLoadingSearch(true);
        setSearchError('');
        try {
            const result = await searchBooks(query, genres, page, BOOKS_PER_PAGE);
            if (result.success) {
                setSearchResults(result.data);
                setTotalPages(result.pagination?.total_pages || 1);
                setTotalResults(result.pagination?.total || 0);
            } else {
                setSearchError(result.message || 'Search failed');
                setSearchResults([]);
            }
        } catch (err) {
            setSearchError('Failed to connect to server');
            setSearchResults([]);
        } finally {
            setLoadingSearch(false);
        }
    }, []);


    // update search query when user types - triggers debounced search after 400ms
    const handleSearchChange = (e) => {
        const value = e.target.value;
        setSearchQuery(value);
    };

    // handle Enter key in search input to trigger search immediately
    const handleSearchKeyDown = (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            const hasSearch = searchQuery.trim().length > 0;
            const hasGenres = selectedGenres.length > 0;
            if (hasSearch || hasGenres) {
                setIsSearchMode(true);
                setCurrentPage(1);
                loadSearchResults(searchQuery, selectedGenres, 1);
            }
        }
    };

    // Unified real-time search and filter logic
    // debounces as user types or selects genres, and instantly exits if all are cleared
    useEffect(() => {
        const hasSearch = searchQuery.trim().length > 0;
        const hasGenres = selectedGenres.length > 0;

        // INSTANT ESCAPE: If everything is cleared, exit search mode instantly (no delay!)
        if (!hasSearch && !hasGenres) {
            setIsSearchMode(false);
            setSearchResults([]);
            setCurrentPage(1);
            return;
        }

        // DEBOUNCE: If they are typing or selecting, wait 400ms then fetch results
        const timer = setTimeout(() => {
            setIsSearchMode(true);
            setCurrentPage(1);
            loadSearchResults(searchQuery, selectedGenres, 1);
        }, 400);

        return () => clearTimeout(timer);
    }, [searchQuery, selectedGenres, loadSearchResults]);

    // reset search and filters, return user to featured books view
    const handleClearSearch = () => {
        setSearchQuery('');
        setSelectedGenres([]);
        setIsSearchMode(false);
        setSearchResults([]);
        setSearchError('');
        setCurrentPage(1);
    };

    // toggle a genre on or off in the multi-select filter
    const toggleGenre = (genre) => {
        setSelectedGenres(prev =>
            prev.includes(genre)
                ? prev.filter(g => g !== genre)
                : [...prev, genre]
        );
    };

    // navigate to next page of search results
    const handleNextPage = () => {
        if (currentPage < totalPages) {
            const newPage = currentPage + 1;
            setCurrentPage(newPage);
            loadSearchResults(searchQuery, selectedGenres, newPage);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    };

    // navigate to previous page of search results
    const handlePrevPage = () => {
        if (currentPage > 1) {
            const newPage = currentPage - 1;
            setCurrentPage(newPage);
            loadSearchResults(searchQuery, selectedGenres, newPage);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    };



    // filter genres based on what user typed and sort by: selected > exact match > starts with > alphabetical
    const filteredGenres = availableGenres
        .filter(genre => {
            const searchWords = genreSearch.toLowerCase().trim().split(/\s+/);
            if (searchWords[0] === "") return true;
            return searchWords.every(word => genre.toLowerCase().includes(word));
        })
        .sort((a, b) => {
            const aSelected = selectedGenres.includes(a);
            const bSelected = selectedGenres.includes(b);

            // priority 1: selected genres go to the top
            if (aSelected && !bSelected) return -1;
            if (!aSelected && bSelected) return 1;

            const query = genreSearch.toLowerCase().trim();
            const aLow = a.toLowerCase();
            const bLow = b.toLowerCase();

            // priority 2: exact match with search text
            if (aLow === query) return -1;
            if (bLow === query) return 1;

            // priority 3: genres that start with search text
            if (aLow.startsWith(query) && !bLow.startsWith(query)) return -1;
            if (!aLow.startsWith(query) && bLow.startsWith(query)) return 1;

            // priority 4: alphabetical order for the rest
            return aLow.localeCompare(bLow);
        });

    // build the heading text that appears above search results
    const getResultsHeading = () => {
        // If they typed a specific keyword, display it
        if (searchQuery.trim()) {
            return (
                <>
                    Search results for <span className="results-highlight">"{searchQuery}"</span>
                </>
            );
        }
        // If they are only filtering by genre, keep it clean and minimal
        return 'Search Results';
    };


    // reusable component for each horizontal scrolling row of books (Popular Picks, New Arrivals, etc)
    // each row shows 5 books visible at once with scroll buttons, has 20 total books
    const GenreRow = ({ genre, books }) => {
        const rowRef = useRef(null);

        // scroll left or right by exactly 5 book widths (each book is 180px + 16px gap)
        const scroll = (direction) => {
            if (rowRef.current) {
                const scrollAmount = direction === 'left' ? -980 : 980;
                rowRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
            }
        };

        return (
            <div className="genre-row">
                <h2 className="genre-title">{genre}</h2>
                <div className="genre-row-wrapper">
                    <button
                        className="scroll-btn"
                        onClick={() => scroll('left')}
                        aria-label={`Scroll ${genre} left`}
                    >
                        ‹
                    </button>
                    <div className="genre-books-row" ref={rowRef}>
                        {books.map(book => (
                            <BookCard key={book.book_id} book={book} />
                        ))}
                    </div>
                    <button
                        className="scroll-btn"
                        onClick={() => scroll('right')}
                        aria-label={`Scroll ${genre} right`}
                    >
                        ›
                    </button>
                </div>
            </div>
        );
    };

    // only display the first 3 rows from featured books
    const featuredEntries = Object.entries(featuredBooks).slice(0, FEATURED_ROW_COUNT);


    return (
        <div className="dashboard">

            {/*  beige background */}
            <header className="dashboard-header">
                <div className="header-logo">
                    <span className="logo-icon">⚔️</span>
                    <span className="logo-text">PageTurners</span>
                </div>
                <nav className="header-nav">
                    <button className="nav-btn" onClick={() => navigate('/library')}>My Library</button>
                    <button className="nav-btn" onClick={() => navigate('/profile')}>Profile</button>
                    <button className="nav-btn logout-btn" onClick={() => {
                        localStorage.removeItem('token');
                        navigate('/login');
                    }}>
                        Logout
                    </button>
                </nav>
            </header>

            {/* slightly darker beige strip */}
            <div className="search-section">
                <div className="search-bar-row">

                    {/* keyword search input - real time, no button needed */}
                    <input
                        type="text"
                        className="search-input"
                        placeholder="Search by title or author..."
                        value={searchQuery}
                        onChange={handleSearchChange}
                        onKeyDown={handleSearchKeyDown}
                        aria-label="Search books by title or author"
                    />

                    {/* genre filter dropdown with built-in search - right side */}
                    <div className="filter-dropdown-wrapper" ref={filterRef}>
                        <button
                            type="button"
                            className={`filter-btn ${selectedGenres.length > 0 ? 'filter-active' : ''}`}
                            onClick={() => setFilterOpen(!filterOpen)}
                            aria-expanded={filterOpen}
                            aria-label="Filter by genre"
                        >
                            Filter by Genre
                            {selectedGenres.length > 0 && (
                                <span className="filter-count">{selectedGenres.length}</span>
                            )}
                            <span className="filter-arrow">{filterOpen ? '▲' : '▼'}</span>
                        </button>

                        {/* dropdown with search bar inside */}
                        {filterOpen && (
                            <div className="genre-dropdown">

                                {/* search input inside the dropdown to find genres quickly */}
                                <div className="genre-search-wrapper">
                                    <input
                                        ref={genreSearchRef}
                                        type="text"
                                        className="genre-search-input"
                                        placeholder="Search genres..."
                                        value={genreSearch}
                                        onChange={(e) => setGenreSearch(e.target.value)}
                                        aria-label="Search genres"
                                    />
                                </div>

                                {/* genre list filtered by search text */}
                                <div className="genre-options-list">
                                    {filteredGenres.length === 0 ? (
                                        <p className="genre-no-match">No genres match "{genreSearch}"</p>
                                    ) : (
                                        filteredGenres.map(genre => (
                                            <label
                                                key={genre}
                                                className={`genre-option ${selectedGenres.includes(genre) ? 'selected' : ''}`}
                                            >
                                                <input
                                                    type="checkbox"
                                                    checked={selectedGenres.includes(genre)}
                                                    onChange={() => toggleGenre(genre)}
                                                    className="genre-checkbox"
                                                />
                                                {genre}
                                            </label>
                                        ))
                                    )}
                                </div>

                                {/* clear all selected genres */}
                                {selectedGenres.length > 0 && (
                                    <button
                                        type="button"
                                        className="clear-genres-btn"
                                        onClick={() => setSelectedGenres([])}
                                    >
                                        Clear all ({selectedGenres.length})
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* selected genre pill tags shown below search row */}
                {selectedGenres.length > 0 && (
                    <div className="selected-genres-tags">
                        {selectedGenres.map(genre => (
                            <span key={genre} className="genre-tag">
                                {genre}
                                <button
                                    className="remove-genre-tag"
                                    onClick={() => toggleGenre(genre)}
                                    aria-label={`Remove ${genre} filter`}
                                >
                                    ×
                                </button>
                            </span>
                        ))}
                    </div>
                )}
            </div>

            {/* main content area - white background */}
            <main className="dashboard-main">

                {isSearchMode && (searchQuery.trim().length > 0 || selectedGenres.length > 0) ? (
                    /* search / filter results view */
                    <div className="search-results-section">

                        {/* centered heading showing what was searched */}
                        <div className="results-heading-wrapper">
                            <h2 className="results-heading">{getResultsHeading()}</h2>
                            {totalResults > 0 && !loadingSearch && (
                                <p className="results-count">{totalResults} book{totalResults !== 1 ? 's' : ''} found</p>
                            )}
                        </div>

                        {/* loading spinner */}
                        {loadingSearch && (
                            <div className="loading-container">
                                <div className="loading-spinner" aria-label="Loading results" />
                            </div>
                        )}

                        {/* error state */}
                        {searchError && !loadingSearch && (
                            <div className="error-message" role="alert">
                                <p>{searchError}</p>
                                <button onClick={() => loadSearchResults(searchQuery, selectedGenres, currentPage)}>
                                    Try again
                                </button>
                            </div>
                        )}

                        {/* no results - UC3 exception */}
                        {!loadingSearch && !searchError && searchResults.length === 0 && (
                            <div className="no-results" role="status">
                                <p className="no-results-title">No results match your search</p>
                                <p className="no-results-hint">Try different keywords or clear the genre filters</p>
                                <button className="clear-search-btn no-results-clear" onClick={handleClearSearch}>
                                    Clear filters
                                </button>
                            </div>
                        )}

                        {/* results grid */}
                        {!loadingSearch && searchResults.length > 0 && (
                            <>
                                <div className="books-grid">
                                    {searchResults.map(book => (
                                        <BookCard key={book.book_id} book={book} />
                                    ))}
                                </div>

                                {/* pagination */}
                                {totalPages > 1 && (
                                    <div className="pagination" role="navigation">
                                        <button
                                            className="pagination-btn"
                                            onClick={handlePrevPage}
                                            disabled={currentPage === 1}
                                        >
                                            Previous
                                        </button>
                                        <span className="pagination-info">
                                            Page {currentPage} of {totalPages}
                                        </span>
                                        <button
                                            className="pagination-btn"
                                            onClick={handleNextPage}
                                            disabled={currentPage === totalPages}
                                        >
                                            Next
                                        </button>
                                    </div>
                                )}
                            </>
                        )}
                    </div>

                ) : (
                    /* featured books view - 3 rows with optimized sorting */
                    <div className="featured-section">
                        <div className="featured-header">
                            <h2 className="section-title">Featured Books</h2>
                            <p className="section-subtitle">Browse our Collection </p>
                        </div>

                        {loadingFeatured && (
                            <div className="loading-container">
                                <div className="loading-spinner" aria-label="Loading books" />
                            </div>
                        )}

                        {featuredError && !loadingFeatured && (
                            <div className="error-message" role="alert">
                                <p>{featuredError}</p>
                                <button onClick={loadInitialBooks}>Try again</button>
                            </div>
                        )}

                        {/* 3 featured rows with improved sorting logic */}
                        {!loadingFeatured && !featuredError && (
                            <div className="genre-rows-container">
                                {/* Row 1: Popular Picks - books with most reviews & high avg rating */}
                                {featuredBooks.row1?.length > 0 && (
                                    <GenreRow genre="Popular Picks" books={featuredBooks.row1} />
                                )}
                                {/* Row 2: New Arrivals - newest books added to database */}
                                {featuredBooks.row2?.length > 0 && (
                                    <GenreRow genre="New Arrivals" books={featuredBooks.row2} />
                                )}
                                {/* Row 3: More to Explore - random selection for discovery */}
                                {featuredBooks.row3?.length > 0 && (
                                    <GenreRow genre="More to Explore" books={featuredBooks.row3} />
                                )}
                            </div>
                        )}
                    </div>
                )}
            </main>
        </div>
    );
}