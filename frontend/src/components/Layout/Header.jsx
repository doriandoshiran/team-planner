import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import ProfileEdit from '../ProfileEdit';
import NotificationCenter from '../Notifications/NotificationCenter';
import LanguageSwitcher from '../LanguageSwitcher/LanguageSwitcher';

const Header = () => {
  const { user, logout } = useAuth();
  const [showProfileEdit, setShowProfileEdit] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState(null);

  useEffect(() => {
    fetchUserAvatar();
  }, []);

  const fetchUserAvatar = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      console.log('Fetching user avatar...');
      const response = await fetch('/api/auth/me', {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.ok) {
        const userData = await response.json();
        console.log('User data received in header:', userData);
        
        // Check for avatar data in multiple possible formats
        if (userData.avatarUrl) {
          console.log('Setting avatar from avatarUrl:', userData.avatarUrl.substring(0, 50) + '...');
          setAvatarUrl(userData.avatarUrl);
        } else if (userData.avatar && userData.avatar.data && userData.avatar.contentType) {
          // Construct data URL from avatar data
          const dataUrl = `data:${userData.avatar.contentType};base64,${userData.avatar.data}`;
          console.log('Setting avatar from avatar data');
          setAvatarUrl(dataUrl);
        } else {
          console.log('No avatar found in user data');
          setAvatarUrl(null);
        }
      } else {
        console.error('Failed to fetch user data:', response.status);
      }
    } catch (error) {
      console.error('Error fetching user avatar:', error);
    }
  };

  const handleProfileClick = () => {
    setShowProfileEdit(true);
  };

  const handleProfileClose = () => {
    setShowProfileEdit(false);
    // Refresh avatar after profile edit
    setTimeout(() => {
      fetchUserAvatar();
    }, 500);
  };

  const handleLogout = () => {
    logout();
  };

  return (
    <>
      <header style={{
        background: '#ffffff',
        borderBottom: '1px solid #e5e7eb',
        padding: '0 24px',
        position: 'sticky',
        top: 0,
        zIndex: 50,
        boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          maxWidth: '1200px',
          margin: '0 auto',
          height: '64px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <h1 style={{
              margin: 0,
              color: '#1f2937',
              fontSize: '28px',
              fontWeight: '700',
              letterSpacing: '-0.025em'
            }}>Team Planner</h1>
          </div>
          
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '20px'
          }}>
            <LanguageSwitcher />
            <NotificationCenter />
            
            {user && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '16px'
              }}>
                <span style={{
                  color: '#6b7280',
                  fontSize: '14px',
                  fontWeight: '500'
                }}>Welcome, {user.name}</span>
                
                <div 
                  onClick={handleProfileClick}
                  style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '50%',
                    cursor: 'pointer',
                    overflow: 'hidden',
                    border: '2px solid #e5e7eb',
                    transition: 'all 0.2s ease',
                    position: 'relative'
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.borderColor = '#3b82f6';
                    e.target.style.transform = 'scale(1.05)';
                    e.target.style.boxShadow = '0 4px 12px rgba(59, 130, 246, 0.15)';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.borderColor = '#e5e7eb';
                    e.target.style.transform = 'scale(1)';
                    e.target.style.boxShadow = 'none';
                  }}
                >
                  {avatarUrl ? (
                    <img 
                      src={avatarUrl} 
                      alt="User Avatar" 
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover'
                      }}
                      onError={(e) => {
                        console.error('Avatar image failed to load:', avatarUrl);
                        setAvatarUrl(null);
                      }}
                      onLoad={() => {
                        console.log('Avatar image loaded successfully');
                      }}
                    />
                  ) : (
                    <div style={{
                      width: '100%',
                      height: '100%',
                      background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
                      color: 'white',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: '600',
                      fontSize: '16px'
                    }}>
                      {user.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
                
                <button 
                  onClick={handleLogout}
                  style={{
                    background: '#ef4444',
                    color: 'white',
                    border: 'none',
                    padding: '8px 16px',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: '500',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.background = '#dc2626';
                    e.target.style.transform = 'translateY(-1px)';
                    e.target.style.boxShadow = '0 2px 8px rgba(239, 68, 68, 0.3)';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.background = '#ef4444';
                    e.target.style.transform = 'translateY(0)';
                    e.target.style.boxShadow = 'none';
                  }}
                >
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
