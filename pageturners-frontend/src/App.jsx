import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Register from './pages/Register';
import Login from './pages/Login';
import VerifyEmail from './pages/VerifyEmail';
import Dashboard from './pages/Dashboard'; // import the dashboard component
import BookDetails from './pages/BookDetails'; //the bookdetails compoenent
import Library from './pages/Library'; // US.7: import library component
/**
 * ProtectedRoute: Checks if a JWT token exists in local storage.
 * If no token is found, it redirects the user to the login page.
 */
const ProtectedRoute = ({ children }) => {
  const token = localStorage.getItem('token'); // retrieve token from login 
  if (!token) {
    // redirect to login if unauthorized 
    return <Navigate to="/login" replace />;
  }
  return children;
};

function App() {
  return (
    <Router>
      <div className="App">
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<Register />} />
          <Route path="/register" element={<Register />} />
          <Route path="/login" element={<Login />} />
          <Route path="/verify-email" element={<VerifyEmail />} />

          {/* Protected Routes */}

          <Route path="/dashboard" element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          } />

          <Route path="/book/:id" element={
            <ProtectedRoute>
              <BookDetails />
            </ProtectedRoute>
          } />

          {/* US.7: Library route */}
          <Route path="/library" element={
            <ProtectedRoute>
              <Library />
            </ProtectedRoute>
          } />
        </Routes>
      </div>
    </Router>
  );
}

export default App;