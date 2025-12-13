import React, { useState, useEffect } from 'react';
import Login from './components/Login';
import Register from './components/Register';
import Dashboard from './components/Dashboard';
import { authService } from './services/auth';

function App() {
  const [currentView, setCurrentView] = useState('login');
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initializeAuth = async () => {
      // Vérifier d'abord les paramètres d'URL (Google OAuth)
      const urlParams = new URLSearchParams(window.location.search);
      const token = urlParams.get('token');
      const userParam = urlParams.get('user');
      
      if (token && userParam) {
        console.log('🎯 OAuth detected in URL');
        try {
          const userData = JSON.parse(decodeURIComponent(userParam));
          localStorage.setItem('token', token);
          localStorage.setItem('user', JSON.stringify(userData));
          setUser(userData);
          window.history.replaceState({}, '', '/'); // Nettoyer l'URL
        } catch (error) {
          console.error('OAuth error:', error);
        }
      } else {
        // Vérifier le localStorage
        const savedToken = localStorage.getItem('token');
        const savedUser = localStorage.getItem('user');

        if (savedToken && savedUser) {
          try {
            const response = await authService.getCurrentUser();
            setUser(response.user);
          } catch (error) {
            authService.logout();
          }
        }
      }
      setLoading(false);
    };

    initializeAuth();
  }, []);

  // Écouteur SIMPLE pour les messages
  useEffect(() => {
    const handleMessage = (event) => {
      console.log('Message received:', event.data);
      
      // Accepter les messages de localhost:8000 ET localhost:3000
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

  const handleLogin = (userData) => {
    setUser(userData);
  };

  const handleRegister = (userData) => {
    setUser(userData);
  };

  const handleLogout = () => {
    setUser(null);
    setCurrentView('login');
    authService.logout();
  };

  if (loading) {
    return (
      <div style={styles.loading}>
        <div style={styles.spinner}></div>
        <p>Loading...</p>
      </div>
    );
  }

  if (user) {
    return <Dashboard user={user} onLogout={handleLogout} />;
  }

  return (
    <div className="App">
      {currentView === 'login' ? (
        <Login 
          onSwitchToRegister={() => setCurrentView('register')} 
          onLogin={handleLogin}
        />
      ) : (
        <Register 
          onSwitchToLogin={() => setCurrentView('login')} 
          onRegister={handleRegister}
        />
      )}
    </div>
  );
}

const styles = {
  loading: {
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '100vh',
    fontSize: '18px',
    color: '#666'
  },
  spinner: {
    border: '4px solid #f3f3f3',
    borderTop: '4px solid #007bff',
    borderRadius: '50%',
    width: '40px',
    height: '40px',
    animation: 'spin 1s linear infinite',
    marginBottom: '20px'
  }
};

const styleSheet = document.styleSheets[0];
styleSheet.insertRule(`
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`, styleSheet.cssRules.length);

export default App;