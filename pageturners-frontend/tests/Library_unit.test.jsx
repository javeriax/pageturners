import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import Library from '../src/pages/Library';
import { MemoryRouter } from 'react-router-dom';
import { vi } from 'vitest';
import React from 'react';
//mock api 
vi.mock('../src/api/books', () => ({
  getLibrary: vi.fn(),
  updateLibraryStatus: vi.fn(),
  removeFromLibrary: vi.fn()
}));

vi.mock('../src/api/library', () => ({
  updateProgress: vi.fn()
}));

import {
  getLibrary,
  updateLibraryStatus,
  removeFromLibrary
} from '../src/api/books';

import { updateProgress } from '../src/api/library';

//mock data
const mockBooks = [
  {
    _id: '1',
    title: 'Book A',
    status: 'currently reading',
    current_page: 50,
    total_pages: 200
  },
  {
    _id: '2',
    title: 'Book B',
    status: 'want to read',
    current_page: 0,
    total_pages: 150
  },
  {
    _id: '3',
    title: 'Book C',
    status: 'completed',
    current_page: 200,
    total_pages: 200
  }
];

//render helper
const renderPage = () =>
  render(
    <MemoryRouter>
      <Library />
    </MemoryRouter>
  );

//setup
beforeEach(() => {
  localStorage.setItem('token', 'fake-token');
  vi.clearAllMocks();
});

//library tests 
// TC-PL-01: Load Library
test('loads and displays books', async () => {
  getLibrary.mockResolvedValue({ success: true, data: mockBooks });

  renderPage();
//wait for books to load and check if they are displayed:
//i means case-insensitive match, so it will match "Book A", "book a", etc
  expect(await screen.findByRole('heading', { name: /my library/i })).toBeInTheDocument();
  expect(await screen.findByText(/book a/i)).toBeInTheDocument();
  expect(await screen.findByText(/book b/i)).toBeInTheDocument();
});

// TC-PL-02: Update Status
test('updates status via dropdown', async () => {
  getLibrary.mockResolvedValue({ success: true, data: mockBooks });
  updateLibraryStatus.mockResolvedValue({ success: true });

  renderPage();

  await waitFor(() => screen.getByText('Book A'));

  const bookA = screen.getByText('Book A').closest('.library-book-card');
  const select = within(bookA).getByRole('combobox');

  fireEvent.change(select, {
    target: { value: 'completed' }
  });

  await waitFor(() => {
    expect(updateLibraryStatus).toHaveBeenCalledWith('1', 'completed');
  });
});

//TC-PL-03A: Update Progress
test('updates reading progress', async () => {
  getLibrary.mockResolvedValue({ success: true, data: mockBooks });
  updateProgress.mockResolvedValue({ success: true });

  renderPage();

  await waitFor(() => screen.getByText('Book A'));

  const input = screen.getByDisplayValue('50');

  fireEvent.change(input, { target: { value: '100' } });

  const saveBtn = screen.getByText('Save Progress');
  fireEvent.click(saveBtn);

  await waitFor(() => {
    expect(updateProgress).toHaveBeenCalledWith('1', 100);
  });
});

//TC-PL-03B: No Progress Input for Completed Books
test('does not show progress input for completed books', async () => {
  getLibrary.mockResolvedValue({ success: true, data: mockBooks });

  renderPage();

  await waitFor(() => screen.getByText('Book C'));

  const bookC = screen.getByText('Book C').closest('.library-book-card');

  expect(within(bookC).queryByRole('spinbutton')).toBeNull();
});

// TC-PL-04: Prevent Page Overflow
test('prevents page overflow input', async () => {
  getLibrary.mockResolvedValue({ success: true, data: mockBooks });

  renderPage();

  await waitFor(() => screen.getByText('Book A'));

  const input = screen.getByDisplayValue('50');

  fireEvent.change(input, { target: { value: '999' } });

  const saveBtn = screen.getByText('Save Progress');
  fireEvent.click(saveBtn);

  await waitFor(() => {
    expect(screen.getByText(/Enter a valid page number/i)).toBeInTheDocument();
  });
});

// TC-PL-05: Display Progress
test('shows progress value correctly', async () => {
  getLibrary.mockResolvedValue({ success: true, data: mockBooks });

  renderPage();

  await waitFor(() => screen.getByText('Book A'));

  expect(screen.getByDisplayValue('50')).toBeInTheDocument();
  expect(screen.getByText('/ 200')).toBeInTheDocument();
});

// TC-PL-06: Grouping by Status
test('groups books by status', async () => {
  getLibrary.mockResolvedValue({ success: true, data: mockBooks });

  renderPage();

  await waitFor(() => {
    expect(screen.getByRole('heading', { name: /Currently Reading/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Want to Read/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Completed/i })).toBeInTheDocument();
  });
});

// TC-PL-07: Prevent Duplicate Books
test('does not duplicate books in UI when reloaded', async () => {
  getLibrary.mockResolvedValue({ success: true, data: mockBooks });

  renderPage();

  await waitFor(() => screen.getByText('Book A'));

  const books = screen.getAllByText('Book A');
  expect(books.length).toBe(1);
});