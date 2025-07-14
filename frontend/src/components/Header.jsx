import React, { useState, useEffect } from 'react';
import ProfileEdit from './ProfileEdit';
import './Header.css';

const Header = () => {
  const [showProfileEdit, setShowProfileEdit] = useState(false);
  const [user, setUser] = useState(null);
  const [avatarUrl, setAvatarUrl] = useState(null);

  useEffect(() => {
    fetchUserProfile();
  }, []);

  const fetchUserProfile = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const response = await fetch('/api/auth/me', {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.ok) {
        const userData = await response.json();
        setUser(userData);
        if (userData.avatarUrl) {
          setAvatarUrl(userData.avatarUrl);
        }
      }
    } catch (error) {
      console.error('Error fetching user profile:', error);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    window.location.href = '/login';
  };

  const handleProfileClick = () => {
    setShowProfileEdit(true);
  };

  const handleProfileClose = () => {
    setShowProfileEdit(false);
    fetchUserProfile(); // Refresh user data after profile edit
  };

  return (
    <>
      <header className="app-header">
        <div className="header-content">
          <div className="header-left">
            <h1>Team Planner</h1>
          </div>
          
          <div className="header-right">
            {user && (
              <div className="user-section">
                <span className="user-name">Welcome, {user.name}</span>
                <div className="user-avatar" onClick={handleProfileClick}>
                  {avatarUrl ? (
                    <img src={avatarUrl} alt="User Avatar" className="avatar-img" />
                  ) : (
                    <div className="avatar-placeholder">
                      {user.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
                <button onClick={handleLogout} className="logout-btn">
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {showProfileEdit && (
        <ProfileEdit onClose={handleProfileClose} />
      )}
    </>
  );
};

export default Header;
