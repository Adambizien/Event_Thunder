import React, { useState } from 'react';
import { authService } from '../services/auth';
import GoogleAuthButton from './GoogleAuthButton';

const Login = ({ onSwitchToRegister, onLogin }) => {
  const [formData, setFormData] = useState({
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
      const response = await authService.login(formData);
      
      // Save token and user data
      localStorage.setItem('token', response.token);
      localStorage.setItem('user', JSON.stringify(response.user));
      
      onLogin(response.user);
    } catch (error) {
      setError(error.response?.data?.message || 'Login failed. Please check your credentials and try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSuccess = (user) => {
    onLogin(user);
  };

  const handleGoogleError = (error) => {
    setError(error);
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={styles.header}>
          <h2 style={styles.title}>Welcome Back</h2>
          <p style={styles.subtitle}>Sign in to your account</p>
        </div>
        
        {error && (
          <div style={styles.error}>
            <div style={styles.errorIcon}>⚠️</div>
            <div style={styles.errorMessage}>{error}</div>
          </div>
        )}
        
        {/* Google OAuth Button */}
        <GoogleAuthButton 
          onSuccess={handleGoogleSuccess}
          onError={handleGoogleError}
          buttonText="Continue with Google"
        />
        
        <div style={styles.divider}>
          <span style={styles.dividerText}>or with email</span>
        </div>
        
        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.inputGroup}>
            <label style={styles.label}>Email Address</label>
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
            <div style={styles.passwordHeader}>
              <label style={styles.label}>Password</label>
              <button type="button" style={styles.forgotButton}>
                Forgot password?
              </button>
            </div>
            <input
              type="password"
              name="password"
              placeholder="Enter your password"
              value={formData.password}
              onChange={handleChange}
              required
              style={styles.input}
              disabled={loading}
            />
          </div>
          
          <button 
            type="submit" 
            disabled={loading}
            style={{
              ...styles.button,
              ...styles.loginButton,
              ...(loading && styles.disabledButton)
            }}
          >
            {loading ? (
              <div style={styles.loadingContent}>
                <div style={styles.spinner}></div>
                Signing in...
              </div>
            ) : (
              'Sign in to your account'
            )}
          </button>
        </form>
        
        <div style={styles.switchContainer}>
          <span style={styles.switchText}>
            Don't have an account?
          </span>
          <button 
            onClick={onSwitchToRegister}
            style={styles.switchButton}
            disabled={loading}
          >
            Sign up
          </button>
        </div>
        
        <div style={styles.footer}>
          <p style={styles.footerText}>
            By continuing, you agree to our Terms of Service and Privacy Policy.
          </p>
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
  header: {
    textAlign: 'center',
    marginBottom: '32px'
  },
  title: {
    marginBottom: '8px',
    color: '#1a1a1a',
    fontSize: '32px',
    fontWeight: '700'
  },
  subtitle: {
    color: '#666',
    fontSize: '16px',
    margin: 0
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
  passwordHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '8px'
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
  loginButton: {
    backgroundColor: '#007bff',
    color: 'white',
    ':hover': {
      backgroundColor: '#0056b3',
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
    backgroundColor: '#fef2f2',
    color: '#dc2626',
    padding: '16px',
    borderRadius: '8px',
    marginBottom: '24px',
    border: '1px solid #fecaca',
    display: 'flex',
    alignItems: 'flex-start',
    gap: '12px'
  },
  errorIcon: {
    fontSize: '16px',
    flexShrink: 0
  },
  errorMessage: {
    fontSize: '14px',
    lineHeight: '1.4'
  },
  forgotButton: {
    background: 'none',
    border: 'none',
    color: '#007bff',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500',
    textDecoration: 'none',
    ':hover': {
      textDecoration: 'underline'
    }
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
  },
  footer: {
    marginTop: '24px',
    textAlign: 'center'
  },
  footerText: {
    color: '#666',
    fontSize: '12px',
    lineHeight: '1.4',
    margin: 0
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

export default Login;