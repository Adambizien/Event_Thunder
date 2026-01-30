import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './components/Login';
import Register from './components/Register';
import Dashboard from './components/Dashboard';
import Profile from './components/Profile';
import Header from './components/Header';
import Footer from './components/Footer';
import ProtectedRoute from './components/ProtectedRoute';
import ForgotPassword from './components/ForgotPassword';
import ResetPassword from './components/ResetPassword';
import Home from './pages/Home';
import { authService } from './services/AuthServices';
import type { User } from './types/AuthTypes';

function AppContent() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initializeAuth = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      const token = urlParams.get('token');
      const userParam = urlParams.get('user');
      
      if (token && userParam) {
        try {
          const userData = JSON.parse(decodeURIComponent(userParam));
          localStorage.setItem('token', token);
          localStorage.setItem('user', JSON.stringify(userData));
          setUser(userData);
          window.history.replaceState({}, '', '/');
        } catch {
          // Silently fail on OAuth parsing error
        }
      } else {
        const savedToken = localStorage.getItem('token');
        const savedUser = localStorage.getItem('user');

        if (savedToken && savedUser) {
          try {
            const response = await authService.getCurrentUser();
            setUser(response.user);
          } catch {
            authService.logout();
          }
        }
      }
      setLoading(false);
    };

    initializeAuth();
  }, []);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
      const apiOrigin = new URL(apiUrl).origin;
      
      if (event.origin !== apiOrigin && event.origin !== window.location.origin) {
        return;
      }

      if (event.data.type === 'OAUTH_SUCCESS') {
        const { token, user } = event.data;
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(user));
        setUser(user);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const handleLogin = (userData: User) => {
    setUser(userData);
  };

  const handleRegister = (userData: User) => {
    setUser(userData);
  };

  const handleLogout = () => {
    setUser(null);
  };

  const handleUpdateProfile = (userData: User) => {
    setUser(userData);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-thunder-navy via-thunder-dark to-thunder-navy flex flex-col items-center justify-center gap-4">
        <div className="animate-spin w-12 h-12 border-4 border-thunder-gold border-t-transparent rounded-full"></div>
        <p className="text-gray-300 text-lg font-semibold">Chargement...</p>
      </div>
    );
  }

  return (
    <>
      <Header user={user} onLogout={handleLogout} />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route 
          path="/login" 
          element={user ? <Navigate to="/dashboard" replace /> : <Login onSwitchToRegister={() => {}} onLogin={handleLogin} />}
        />
        <Route 
          path="/register" 
          element={user ? <Navigate to="/dashboard" replace /> : <Register onSwitchToLogin={() => {}} onRegister={handleRegister} />}
        />
        <Route 
          path="/forgot-password" 
          element={user ? <Navigate to="/dashboard" replace /> : <ForgotPassword />}
        />
        <Route 
          path="/reset-password" 
          element={user ? <Navigate to="/dashboard" replace /> : <ResetPassword />}
        />
        <Route 
          path="/dashboard" 
          element={
            <ProtectedRoute user={user}>
              <Dashboard user={user!} />
            </ProtectedRoute>
          }
        />
        <Route 
          path="/profile" 
          element={
            <ProtectedRoute user={user}>
              <Profile user={user!} onUpdate={handleUpdateProfile} onLogout={handleLogout} />
            </ProtectedRoute>
          }
        />
      </Routes>
      <Footer />
    </>
  );
}

function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}

export default App;