import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import Register from './pages/Register';
import VerifyEmail from './pages/VerifyEmail';

// App: Main application component that sets up routing for different pages
function App() {
  return (
    // Router wraps all routes. Allows navigation between pages without page reload
    <Router>
      <div className="App">
        {/* Routes defines which component to show based on URL path */}
        <Routes>
          {/* "/" path shows Register component - this is the main page */}
          <Route path="/" element={<Register />} />

          {/* Uncomment the following line when login page is ready */}
          {/* <Route path="/login" element={<Login />} /> */}

          {/* "/home" path shows Home component */}
          <Route path="/home" element={<Home />} />
          {/* "/verify-email" path shows VerifyEmail component - clicked from email link */}
          <Route path="/verify-email" element={<VerifyEmail />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;