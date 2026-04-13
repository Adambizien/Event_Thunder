import { useState, useEffect } from 'react';
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  useLocation,
  useNavigate,
} from 'react-router-dom';
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
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
import AdminSubscriptionTransactions from './pages/admin/SubscriptionTransactions';
import AdminTicketTransactions from './pages/admin/TicketTransactions';
import AdminUsers from './pages/admin/Users';
import AdminEventCategories from './pages/admin/EventCategories';
import AdminEvents from './pages/admin/Events';
import EventDetails from './pages/events/EventDetails';
import EventsList from './pages/events/EventsList';
import { authService } from './services/AuthServices';
import type { User } from './types/AuthTypes';
import Subscription from './pages/sub/Subscription';
import SubscriptionHistory from './pages/sub/SubscriptionHistory';
import MyTickets from './pages/tickets/MyTickets';
import OrganizerLayout from './components/OrganizerLayout';
import OrganizerDashboard from './pages/organizer/Dashboard';
import OrganizerCreateEvent from './pages/organizer/CreateEvent';


function AppContent() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const location = useLocation();
  const navigate = useNavigate();
  const isAdminRoute = location.pathname.startsWith('/admin');
  const isOrganizerRoute = location.pathname.startsWith('/organizer');

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
          localStorage.removeItem('token');
          localStorage.removeItem('user');
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

  useEffect(() => {
    if (loading || !user) return;

    const path = location.pathname;
    if (path !== '/login' && path !== '/register') return;

    const searchParams = new URLSearchParams(location.search);
    const redirect = searchParams.get('redirect');
    if (redirect === 'subscription') {
      navigate('/subscription', { replace: true });
      return;
    }
    navigate('/', { replace: true });
  }, [loading, user, location.pathname, location.search, navigate]);

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
        <Route path="/events" element={<EventsList />} />
        <Route path="/events/:id" element={<EventDetails />} />
        <Route 
          path="/login" 
          element={<Login onLogin={handleLogin} />}
        />
        <Route 
          path="/register" 
          element={<Register onRegister={handleRegister} />}
        />
        <Route 
          path="/forgot-password" 
          element={user ? <Navigate to="/" replace /> : <ForgotPassword />}
        />
        <Route 
          path="/reset-password" 
          element={user ? <Navigate to="/" replace /> : <ResetPassword />}
        />
        <Route
          path="/subscription/*"
          element={<Subscription />}
        />
        <Route
          path="/subscription-history"
          element={
            <ProtectedRoute user={user}>
              <SubscriptionHistory />
            </ProtectedRoute>
          }
        />
        <Route
          path="/my-tickets"
          element={
            <ProtectedRoute user={user}>
              <MyTickets />
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
          <Route path="events" element={<AdminEvents />} />
          <Route path="event-categories" element={<AdminEventCategories />} />
          <Route path="subscription-transactions" element={<AdminSubscriptionTransactions />} />
          <Route path="ticket-transactions" element={<AdminTicketTransactions />} />
          <Route path="users" element={<AdminUsers />} />
        </Route>
        <Route
          path="/organizer"
          element={
            <ProtectedRoute user={user}>
              <OrganizerLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<OrganizerDashboard user={user!} />} />
          <Route path="create-event" element={<OrganizerCreateEvent user={user!} />} />
        </Route>
      </Routes>
      {!isAdminRoute && !isOrganizerRoute && <Footer />}
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