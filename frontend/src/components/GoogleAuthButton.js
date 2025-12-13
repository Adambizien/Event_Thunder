import React, { useState } from 'react';

const GoogleAuthButton = ({ onSuccess, onError, buttonText = "Continue with Google" }) => {
  const [loading, setLoading] = useState(false);

  const handleGoogleLogin = async () => {
    setLoading(true);
    
    try {
      const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:8000';
      const response = await fetch(`${apiUrl}/api/auth/google/url`);
      const { authUrl: googleAuthUrl } = await response.json();
      
      console.log('🔗 Opening Google OAuth in popup...');
      
      // Ouvrir dans une popup
      const width = 500;
      const height = 600;
      const left = (window.screen.width - width) / 2;
      const top = (window.screen.height - height) / 2;
      
      const popup = window.open(
        googleAuthUrl,
        'google-auth',
        `width=${width},height=${height},top=${top},left=${left}`
      );
      
      if (!popup) {
        throw new Error('Please allow popups for Google authentication');
      }
      
      // Vérifier si la popup est fermée
      const checkPopup = setInterval(() => {
        if (popup.closed) {
          clearInterval(checkPopup);
          console.log('🔒 Google auth popup closed');
          setLoading(false);
          
          // Vérifier si l'utilisateur est connecté
          setTimeout(() => {
            const token = localStorage.getItem('token');
            const user = localStorage.getItem('user');
            
            if (token && user) {
              console.log('✅ User authenticated after popup close');
              onSuccess(JSON.parse(user));
            }
          }, 500);
        }
      }, 500);
      
    } catch (error) {
      console.error('Google auth error:', error);
      onError(error.message || 'Failed to start Google authentication');
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleGoogleLogin}
      disabled={loading}
      style={{
        ...styles.googleButton,
        ...(loading && styles.disabledButton)
      }}
    >
      <div style={styles.buttonContent}>
        <svg style={styles.googleIcon} viewBox="0 0 24 24" width="20" height="20">
          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
        </svg>
        <span style={styles.buttonText}>
          {loading ? 'Connecting...' : buttonText}
        </span>
      </div>
    </button>
  );
};

const styles = {
  googleButton: {
    width: '100%',
    padding: '12px 16px',
    border: '1px solid #ddd',
    borderRadius: '8px',
    backgroundColor: 'white',
    color: '#333',
    fontSize: '16px',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    marginBottom: '16px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '12px',
    ':hover': {
      backgroundColor: '#f8f9fa',
      boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
      borderColor: '#ccc'
    }
  },
  disabledButton: {
    opacity: 0.6,
    cursor: 'not-allowed',
    ':hover': {
      backgroundColor: 'white',
      boxShadow: 'none'
    }
  },
  buttonContent: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '12px'
  },
  googleIcon: {
    width: '20px',
    height: '20px'
  },
  buttonText: {
    fontSize: '15px'
  }
};

export default GoogleAuthButton;