import React, { useState } from 'react';
import { authService } from '../services/auth';
import GoogleAuthButton from './GoogleAuthButton';

const Register = ({ onSwitchToLogin, onRegister }) => {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await authService.register(formData);
      
      // Save token and user data
      localStorage.setItem('token', response.token);
      localStorage.setItem('user', JSON.stringify(response.user));
      
      onRegister(response.user);
    } catch (error) {
      setError(error.response?.data?.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSuccess = (user) => {
    onRegister(user);
  };

  const handleGoogleError = (error) => {
    setError(error);
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h2 style={styles.title}>Create Account</h2>
        <p style={styles.subtitle}>Sign up to get started</p>
        
        {error && (
          <div style={styles.error}>
            {error}
          </div>
        )}
        
        {/* Google OAuth Button */}
        <GoogleAuthButton 
          onSuccess={handleGoogleSuccess}
          onError={handleGoogleError}
          buttonText="Sign up with Google"
        />
        
        <div style={styles.divider}>
          <span style={styles.dividerText}>or with email</span>
        </div>
        
        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.inputGroup}>
            <label style={styles.label}>Username</label>
            <input
              type="text"
              name="username"
              placeholder="Enter your username"
              value={formData.username}
              onChange={handleChange}
              required
              style={styles.input}
              disabled={loading}
            />
          </div>
          
          <div style={styles.inputGroup}>
            <label style={styles.label}>Email</label>
            <input
              type="email"
              name="email"
              placeholder="Enter your email"
              value={formData.email}
              onChange={handleChange}
              required
              style={styles.input}
              disabled={loading}
            />
          </div>
          
          <div style={styles.inputGroup}>
            <label style={styles.label}>Password</label>
            <input
              type="password"
              name="password"
              placeholder="Create a password"
              value={formData.password}
              onChange={handleChange}
              required
              style={styles.input}
              disabled={loading}
              minLength="6"
            />
            <div style={styles.passwordHint}>Must be at least 6 characters</div>
          </div>
          
          <button 
            type="submit" 
            disabled={loading}
            style={{
              ...styles.button,
              ...styles.registerButton,
              ...(loading && styles.disabledButton)
            }}
          >
            {loading ? (
              <div style={styles.loadingContent}>
                <div style={styles.spinner}></div>
                Creating account...
              </div>
            ) : (
              'Create Account'
            )}
          </button>
        </form>
        
        <div style={styles.switchContainer}>
          <span style={styles.switchText}>
            Already have an account?
          </span>
          <button 
            onClick={onSwitchToLogin}
            style={styles.switchButton}
            disabled={loading}
          >
            Sign in
          </button>
        </div>
      </div>
    </div>
  );
};

const styles = {
  container: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '100vh',
    padding: '20px',
    backgroundColor: '#f8f9fa',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
  },
  card: {
    background: 'white',
    padding: '40px',
    borderRadius: '12px',
    boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)',
    width: '100%',
    maxWidth: '440px',
    border: '1px solid #e1e5e9'
  },
  title: {
    textAlign: 'center',
    marginBottom: '8px',
    color: '#1a1a1a',
    fontSize: '32px',
    fontWeight: '700'
  },
  subtitle: {
    textAlign: 'center',
    marginBottom: '32px',
    color: '#666',
    fontSize: '16px'
  },
  form: {
    width: '100%'
  },
  inputGroup: {
    marginBottom: '24px'
  },
  label: {
    display: 'block',
    marginBottom: '8px',
    color: '#333',
    fontSize: '14px',
    fontWeight: '500'
  },
  input: {
    width: '100%',
    padding: '14px 16px',
    border: '2px solid #e1e5e9',
    borderRadius: '8px',
    fontSize: '16px',
    outline: 'none',
    transition: 'all 0.2s ease',
    backgroundColor: '#fff',
    boxSizing: 'border-box',
    ':focus': {
      borderColor: '#007bff',
      boxShadow: '0 0 0 3px rgba(0, 123, 255, 0.1)'
    },
    ':disabled': {
      backgroundColor: '#f8f9fa',
      cursor: 'not-allowed'
    }
  },
  passwordHint: {
    fontSize: '12px',
    color: '#666',
    marginTop: '6px'
  },
  button: {
    width: '100%',
    padding: '16px',
    border: 'none',
    borderRadius: '8px',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px'
  },
  registerButton: {
    backgroundColor: '#28a745',
    color: 'white',
    ':hover': {
      backgroundColor: '#218838',
      transform: 'translateY(-1px)'
    }
  },
  disabledButton: {
    opacity: 0.6,
    cursor: 'not-allowed',
    transform: 'none !important'
  },
  loadingContent: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  },
  spinner: {
    width: '16px',
    height: '16px',
    border: '2px solid transparent',
    borderTop: '2px solid currentColor',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite'
  },
  error: {
    backgroundColor: '#f8d7da',
    color: '#721c24',
    padding: '16px',
    borderRadius: '8px',
    marginBottom: '24px',
    border: '1px solid #f5c6cb',
    fontSize: '14px'
  },
  divider: {
    position: 'relative',
    textAlign: 'center',
    margin: '32px 0',
    '::before': {
      content: '""',
      position: 'absolute',
      top: '50%',
      left: 0,
      right: 0,
      height: '1px',
      backgroundColor: '#e1e5e9'
    }
  },
  dividerText: {
    backgroundColor: 'white',
    padding: '0 16px',
    color: '#666',
    fontSize: '14px',
    position: 'relative',
    display: 'inline-block'
  },
  switchContainer: {
    textAlign: 'center',
    marginTop: '32px',
    paddingTop: '24px',
    borderTop: '1px solid #e1e5e9'
  },
  switchText: {
    color: '#666',
    fontSize: '14px',
    marginRight: '8px'
  },
  switchButton: {
    background: 'none',
    border: 'none',
    color: '#007bff',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '600',
    textDecoration: 'none',
    ':hover': {
      textDecoration: 'underline'
    },
    ':disabled': {
      opacity: 0.6,
      cursor: 'not-allowed'
    }
  }
};

// Add CSS animation
const styleSheet = document.styleSheets[0];
styleSheet.insertRule(`
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`, styleSheet.cssRules.length);

export default Register;