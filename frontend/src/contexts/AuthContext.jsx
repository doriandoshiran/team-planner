import React, { createContext, useContext, useState, useEffect } from 'react';
import { authService } from '../services/authService';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const currentUser = authService.getCurrentUser();
    if (currentUser) {
      setUser(currentUser);
    }
    setLoading(false);
  }, []);

  const login = async (credentials) => {
    try {
      console.log('Frontend: Attempting login with:', credentials);
      const data = await authService.login(credentials);
      console.log('Frontend: Login successful, received:', data);
      setUser(data.user);
      return data;
    } catch (error) {
      console.error('Frontend: Login failed:', error);
      throw error;
    }
  };

  // Admin-only registration
  const registerUser = async (userData) => {
    try {
      if (user?.role !== 'admin') {
        throw new Error('Only administrators can create user accounts');
      }
      const data = await authService.adminRegister(userData);
      return data;
    } catch (error) {
      throw error;
    }
  };

  const logout = () => {
    authService.logout();
    setUser(null);
  };

  const value = {
    user,
    login,
    registerUser, // Admin-only function
    logout,
    isAuthenticated: !!user,
    isAdmin: user?.role === 'admin',
    loading
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
