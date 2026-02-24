import Subscription from './pages/sub/Subscription';
import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import Dashboard from './components/Dashboard';
import Profile from './pages/profile/Profile';
import Header from './components/Header';
import Footer from './components/Footer';
import ProtectedRoute from './components/ProtectedRoute';
import ProtectedAdminRoute from './components/ProtectedAdminRoute';
import AdminLayout from './components/AdminLayout';
import ForgotPassword from './pages/auth/ForgotPassword';
import ResetPassword from './pages/auth/ResetPassword';
import Home from './pages/Home';
import AdminDashboard from './pages/admin/Dashboard';
import AdminPlans from './pages/admin/Plans';
import AdminUsers from './pages/admin/Users';
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
          // Erreur
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

  if (!loading && user) {
    const path = window.location.pathname;
    if (path === '/login' || path === '/register') {
      const searchParams = new URLSearchParams(window.location.search);
      const redirect = searchParams.get('redirect');
      if (redirect === 'subscription') {
        window.location.replace('/subscription');
        return null;
      }
      window.location.replace('/dashboard');
      return null;
    }
  }

  return (
    <>
      <Header user={user} onLogout={handleLogout} />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route 
          path="/login" 
          element={<Login onSwitchToRegister={() => {}} onLogin={handleLogin} />}
        />
        <Route 
          path="/register" 
          element={<Register onSwitchToLogin={() => {}} onRegister={handleRegister} />}
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
          path="/subscription"
          element={<Subscription />}
        />
        <Route 
          path="/profile" 
          element={
            <ProtectedRoute user={user}>
              <Profile user={user!} onUpdate={handleUpdateProfile} onLogout={handleLogout} />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin"
          element={
            <ProtectedAdminRoute user={user}>
              <AdminLayout />
            </ProtectedAdminRoute>
          }
        >
          <Route index element={<AdminDashboard />} />
          <Route path="plans" element={<AdminPlans />} />
          <Route path="users" element={<AdminUsers />} />
        </Route>
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