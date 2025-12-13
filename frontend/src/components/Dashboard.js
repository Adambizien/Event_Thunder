import React from 'react';
import { authService } from '../services/auth';

const Dashboard = ({ user, onLogout }) => {
  const handleLogout = () => {
    authService.logout();
    onLogout();
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={styles.header}>
          <h1 style={styles.title}>🎉 Welcome to Your Dashboard!</h1>
          <p style={styles.subtitle}>You are successfully logged in</p>
        </div>
        
        <div style={styles.userInfo}>
          <h2 style={styles.sectionTitle}>Your Profile Information</h2>
          
          <div style={styles.infoGrid}>
            <div style={styles.infoItem}>
              <strong>Username:</strong>
              <span style={styles.infoValue}>{user.username}</span>
            </div>
            
            <div style={styles.infoItem}>
              <strong>Email:</strong>
              <span style={styles.infoValue}>{user.email}</span>
            </div>
            
            <div style={styles.infoItem}>
              <strong>User ID:</strong>
              <span style={styles.infoValue}>{user.id}</span>
            </div>
            
            {user.name && (
              <div style={styles.infoItem}>
                <strong>Full Name:</strong>
                <span style={styles.infoValue}>{user.name}</span>
              </div>
            )}
            
            {user.picture && (
              <div style={styles.infoItem}>
                <strong>Profile Picture:</strong>
                <div style={styles.avatarContainer}>
                  <img 
                    src={user.picture} 
                    alt="Profile" 
                    style={styles.avatar}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
        
        <div style={styles.actions}>
          <button 
            onClick={handleLogout}
            style={styles.logoutButton}
          >
            🚪 Logout
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
    maxWidth: '500px',
    border: '1px solid #e1e5e9'
  },
  header: {
    textAlign: 'center',
    marginBottom: '30px'
  },
  title: {
    marginBottom: '8px',
    color: '#1a1a1a',
    fontSize: '28px',
    fontWeight: '700'
  },
  subtitle: {
    color: '#666',
    fontSize: '16px',
    margin: 0
  },
  userInfo: {
    marginBottom: '30px'
  },
  sectionTitle: {
    marginBottom: '20px',
    color: '#333',
    fontSize: '20px',
    fontWeight: '600',
    borderBottom: '2px solid #007bff',
    paddingBottom: '8px'
  },
  infoGrid: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px'
  },
  infoItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px 0',
    borderBottom: '1px solid #f0f0f0'
  },
  infoValue: {
    color: '#666',
    fontWeight: '500'
  },
  avatarContainer: {
    display: 'flex',
    alignItems: 'center'
  },
  avatar: {
    width: '50px',
    height: '50px',
    borderRadius: '50%',
    border: '2px solid #e1e5e9'
  },
  actions: {
    textAlign: 'center'
  },
  logoutButton: {
    padding: '12px 24px',
    backgroundColor: '#dc3545',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    ':hover': {
      backgroundColor: '#c82333',
      transform: 'translateY(-1px)'
    }
  }
};

export default Dashboard;