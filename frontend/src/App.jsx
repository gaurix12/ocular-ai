import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { PredictionProvider } from './context/PredictionContext';
import Navbar from './components/Navbar';
import ProtectedRoute from './components/ProtectedRoute';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import Upload from './pages/Upload';
import Results from './pages/Results';
import History from './pages/History';

function App() {
  return (
    <AuthProvider>
      <PredictionProvider>
        <Router>
          <div className="min-h-screen flex flex-col animated-bg">
            <Navbar />
            <main className="flex-grow">
              <Routes>
                {/* Public Routes */}
                <Route path="/" element={<Home />} />
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />

                {/* Protected Routes */}
                <Route
                  path="/upload"
                  element={
                    <ProtectedRoute>
                      <Upload />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/results"
                  element={
                    <ProtectedRoute>
                      <Results />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/history"
                  element={
                    <ProtectedRoute>
                      <History />
                    </ProtectedRoute>
                  }
                />
              </Routes>
            </main>

            {/* Simple Footer */}
            <footer className="py-8 px-4 border-t border-slate-800/50 text-center">
              <p className="text-slate-500 text-sm">
                &copy; {new Date().getFullYear()} IrisAI Medical Diagnostics. Built for clinical educational purposes.
              </p>
            </footer>
          </div>
        </Router>
      </PredictionProvider>
    </AuthProvider>
  );
}

export default App;
