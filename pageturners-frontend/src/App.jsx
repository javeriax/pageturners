import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import Register from './pages/Register';
import Login from './pages/Login';

// App: Main application component that sets up routing for different pages
function App() {
  return (
    // Router wraps all routes. Allows navigation between pages without page reload
    <Router>
      <div className="App">
        {/* Routes defines which component to show based on URL path */}
        <Routes>
          {/* "/" path shows Register component - this is the main page */}
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<Register />} />
          {/* "/home" path shows Home component */}
          <Route path="/home" element={<Home />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;