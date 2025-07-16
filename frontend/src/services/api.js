import axios from 'axios';

// Determine the API base URL based on environment
const getApiBaseUrl = () => {
  // In production build, use the environment variable
  if (process.env.REACT_APP_API_URL) {
    return process.env.REACT_APP_API_URL;
  }
  
  // In development, try to detect the current host
  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    return 'http://localhost:5000/api';
  }
  
  // For VPN network access
  if (window.location.hostname.startsWith('10.212.')) {
    return `http://${window.location.hostname}:5000/api`;
  }
  
  // Updated fallback to your current VPN IP
  return 'http://10.212.247.198:5000/api';
};

const API_BASE_URL = getApiBaseUrl();

console.log('API Base URL:', API_BASE_URL);

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    // Log request details for debugging
    console.log('API Request:', {
      method: config.method?.toUpperCase(),
      url: config.url,
      baseURL: config.baseURL,
      hasAuth: !!config.headers.Authorization
    });
    
    return config;
  },
  (error) => {
    console.error('Request interceptor error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor to handle auth errors
api.interceptors.response.use(
  (response) => {
    // Log successful responses for debugging
    console.log('API Response:', {
      status: response.status,
      url: response.config.url,
      method: response.config.method?.toUpperCase(),
      dataStructure: typeof response.data
    });
    return response;
  },
  (error) => {
    console.error('API Error:', error);
    
    // Handle network errors
    if (error.code === 'ERR_NETWORK') {
      console.error('Network error - check if backend is running');
      return Promise.reject(new Error('Network error: Unable to connect to server'));
    }
    
    // Handle CORS errors
    if (error.message?.includes('CORS')) {
      console.error('CORS error - check backend CORS configuration');
      return Promise.reject(new Error('CORS error: Cross-origin request blocked'));
    }
    
    // Handle authentication errors
    if (error.response?.status === 401) {
      console.log('Authentication failed - redirecting to login');
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    
    // Handle other HTTP errors
    if (error.response) {
      console.error('HTTP Error:', {
        status: error.response.status,
        statusText: error.response.statusText,
        data: error.response.data
      });
    }
    
    return Promise.reject(error);
  }
);

export default api;
