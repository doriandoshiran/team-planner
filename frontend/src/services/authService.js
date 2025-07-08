import api from './api';

export const authService = {
  login: async (credentials) => {
    try {
      console.log('AuthService: Attempting login with:', credentials);
      const response = await api.post('/auth/login', credentials);
      console.log('AuthService: Full login response:', response);
      console.log('AuthService: Response data:', response.data);
      
      if (response.data && response.data.token && response.data.user) {
        const token = response.data.token;
        const user = response.data.user;
        
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(user));
        
        console.log('AuthService: Token saved:', token);
        console.log('AuthService: User saved:', user);
        
        // Verify storage
        const storedToken = localStorage.getItem('token');
        const storedUser = localStorage.getItem('user');
        console.log('AuthService: Verification - stored token:', storedToken);
        console.log('AuthService: Verification - stored user:', storedUser);
        
        return response.data;
      } else {
        console.error('AuthService: Invalid response structure:', response.data);
        throw new Error('Invalid login response');
      }
    } catch (error) {
      console.error('AuthService: Login error:', error);
      throw error;
    }
  },

  register: async (userData) => {
    const response = await api.post('/auth/register', userData);
    return response.data;
  },

  adminRegister: async (userData) => {
    const response = await api.post('/auth/admin/register', userData);
    return response.data;
  },

  logout: () => {
    console.log('AuthService: Logging out, clearing localStorage');
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  },

  getCurrentUser: () => {
    try {
      const user = localStorage.getItem('user');
      console.log('AuthService: Getting current user from localStorage:', user);
      return user ? JSON.parse(user) : null;
    } catch (error) {
      console.error('AuthService: Error parsing user data:', error);
      return null;
    }
  },

  isAuthenticated: () => {
    const token = localStorage.getItem('token');
    const hasToken = !!token;
    console.log('AuthService: Checking authentication, token exists:', hasToken);
    if (hasToken) {
      console.log('AuthService: Token value:', token.substring(0, 20) + '...');
    }
    return hasToken;
  }
};
