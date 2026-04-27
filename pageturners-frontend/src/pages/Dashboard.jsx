// UC3,10
// Main dashboard page shown after login: displays 3 featured book sections + search/filter UI
// 
// Featured Sections:
// 1. Popular Picks - books with highest review count & good avg ratings (from reviews aggregation)
// 2. New Arrivals - newest books added to database (sorted by created_at desc)
// 3. More to Explore - random selection for discovery (refreshes each load)
//
// Search/Filter: Real-time keyword search + multi-select genre filtering 
// Each section scrolls horizontally showing 5 books visible at once (20 total per row)

import React from 'react';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { searchBooks, getInitialBooks, getGenres } from '../api/dashboard';
import '../styles/Dashboard.css';
import BookCard from '../components/BookCard';

export default function Dashboard() {
    const navigate = useNavigate();

    // search input value typed by user
    const [searchQuery, setSearchQuery] = useState('');

    // text typed inside the genre search box inside the dropdown
    const [genreSearch, setGenreSearch] = useState('');

    // list of genres selected in the filter dropdown
    const [selectedGenres, setSelectedGenres] = useState([]);

    // all available genres fetched from backend
    const [availableGenres, setAvailableGenres] = useState([]);

    // whether the genre filter dropdown is open
    const [filterOpen, setFilterOpen] = useState(false);

    // featured books grouped by genre - only first 3 genres shown
    const [featuredBooks, setFeaturedBooks] = useState({});

    // search results when user is actively searching or filtering
    const [searchResults, setSearchResults] = useState([]);

    // pagination state for search results
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalResults, setTotalResults] = useState(0);

    // whether user is in search/filter mode
    const [isSearchMode, setIsSearchMode] = useState(false);

    // loading states
    const [loadingFeatured, setLoadingFeatured] = useState(true);
    const [loadingSearch, setLoadingSearch] = useState(false);

    // error messages
    const [featuredError, setFeaturedError] = useState('');
    const [searchError, setSearchError] = useState('');

    // ref for genre dropdown to detect outside clicks
    const filterRef = useRef(null);

    // ref for genre search input to auto-focus when dropdown opens
    const genreSearchRef = useRef(null);

    // books per page for search results
    const BOOKS_PER_PAGE = 12;

    // only show first 3 genres in featured rows
    const FEATURED_ROW_COUNT = 3;

    // books fetched per featured row (more than 5 so user can scroll)
    const BOOKS_PER_ROW = 20;


    // redirect to login if no token found
    useEffect(() => {
        const token = localStorage.getItem('token');
        if (!token) navigate('/login');
    }, [navigate]);


    // load initial books and genres on mount - run in parallel for speed
    useEffect(() => {
        loadInitialBooks();
        loadGenres();
    }, []);


    // auto-filter when genres change - 300ms debounce to avoid spamming api
    useEffect(() => {
        const timer = setTimeout(() => {
            const hasSearch = searchQuery.trim().length > 0;
            const hasGenres = selectedGenres.length > 0;

            if (hasSearch || hasGenres) {
                setIsSearchMode(true);
                setCurrentPage(1);
                loadSearchResults(searchQuery, selectedGenres, 1);
            } else {
                setIsSearchMode(false);
                setSearchResults([]);
            }
        }, 300);

        return () => clearTimeout(timer);
    }, [selectedGenres]);


    // auto-focus genre search input when dropdown opens
    useEffect(() => {
        if (filterOpen && genreSearchRef.current) {
            setTimeout(() => genreSearchRef.current?.focus(), 50);
        }
        if (!filterOpen) {
            // clear genre search text when dropdown closes
            setGenreSearch('');
        }
    }, [filterOpen]);


    // close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (filterRef.current && !filterRef.current.contains(e.target)) {
                setFilterOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);


    // fetch initial books for 3 rows - fast single query
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


    // fetch all genres for the filter dropdown
    const loadGenres = async () => {
        const result = await getGenres();
        if (result.success) setAvailableGenres(result.data);
    };


    // fetch search/filter results from backend
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


    // handle typing in the search bar - real time search with debounce
    const handleSearchChange = (e) => {
        const value = e.target.value;
        setSearchQuery(value);
    };


    // trigger search when user presses Enter in the search bar
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


    // debounce real-time search as user types
    useEffect(() => {
        const timer = setTimeout(() => {
            const hasSearch = searchQuery.trim().length > 0;
            const hasGenres = selectedGenres.length > 0;

            if (hasSearch || hasGenres) {
                setIsSearchMode(true);
                setCurrentPage(1);
                loadSearchResults(searchQuery, selectedGenres, 1);
            } else if (!hasSearch && !hasGenres) {
                setIsSearchMode(false);
                setSearchResults([]);
            }
        }, 400);

        return () => clearTimeout(timer);
    }, [searchQuery]);


    // clear all search and filters - return to featured view
    const handleClearSearch = () => {
        setSearchQuery('');
        setSelectedGenres([]);
        setIsSearchMode(false);
        setSearchResults([]);
        setSearchError('');
        setCurrentPage(1);
    };


    // toggle a genre in the multi-select list
    const toggleGenre = (genre) => {
        setSelectedGenres(prev =>
            prev.includes(genre)
                ? prev.filter(g => g !== genre)
                : [...prev, genre]
        );
    };


    // pagination handlers
    const handleNextPage = () => {
        if (currentPage < totalPages) {
            const newPage = currentPage + 1;
            setCurrentPage(newPage);
            loadSearchResults(searchQuery, selectedGenres, newPage);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    };

    const handlePrevPage = () => {
        if (currentPage > 1) {
            const newPage = currentPage - 1;
            setCurrentPage(newPage);
            loadSearchResults(searchQuery, selectedGenres, newPage);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    };



    // genres filtered and sorted: Selected > Exact Match > Starts With > Alpha
    const filteredGenres = availableGenres
        .filter(genre => {
            const searchWords = genreSearch.toLowerCase().trim().split(/\s+/);
            if (searchWords[0] === "") return true;
            return searchWords.every(word => genre.toLowerCase().includes(word));
        })
        .sort((a, b) => {
            const aSelected = selectedGenres.includes(a);
            const bSelected = selectedGenres.includes(b);

            // 1. TOP PRIORITY: Selected/Checked genres always go to the very top
            if (aSelected && !bSelected) return -1;
            if (!aSelected && bSelected) return 1;

            const query = genreSearch.toLowerCase().trim();
            const aLow = a.toLowerCase();
            const bLow = b.toLowerCase();

            // 2. SECOND PRIORITY: Exact match (if user is typing)
            if (aLow === query) return -1;
            if (bLow === query) return 1;

            // 3. THIRD PRIORITY: Starts with query
            if (aLow.startsWith(query) && !bLow.startsWith(query)) return -1;
            if (!aLow.startsWith(query) && bLow.startsWith(query)) return 1;

            // 4. FALLBACK: Alphabetical order
            return aLow.localeCompare(bLow);
        });

    // build the context message shown above search results
    const getResultsHeading = () => {
        if (searchQuery.trim() && selectedGenres.length > 0) {
            return (
                <>
                    Search results for <span className="results-highlight">"{searchQuery}"</span>
                    {' '}in <span className="results-highlight">{selectedGenres.join(', ')}</span>
                </>
            );
        }
        if (searchQuery.trim()) {
            return (
                <>
                    Search results for <span className="results-highlight">"{searchQuery}"</span>
                </>
            );
        }
        if (selectedGenres.length > 0) {
            return (
                <>
                    Showing books in <span className="results-highlight">{selectedGenres.join(', ')}</span>
                </>
            );
        }
        return 'Search Results';
    };


    // horizontal scrollable row component for featured book sections
    // shows 5 books visible with scroll buttons, 20 total books per row
    // all cards have uniform height (322px) so titles align in same visual row
    const GenreRow = ({ genre, books }) => {
        const rowRef = useRef(null);

        // scroll by exactly 5 book widths (180px each + 16px gap = ~980px)
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


    // only show first 3 genres for the featured section
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

                    {/* clear button - only shown when something is active */}
                    {(isSearchMode || searchQuery || selectedGenres.length > 0) && (
                        <button
                            type="button"
                            className="clear-search-btn"
                            onClick={handleClearSearch}
                        >
                            Clear
                        </button>
                    )}

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

                {isSearchMode ? (
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