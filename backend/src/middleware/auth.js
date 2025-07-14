const jwt = require('jsonwebtoken');
const User = require('../models/User');

const auth = async (req, res, next) => {
  try {
    console.log('Auth middleware: Checking for token...');
    
    // Check for token in both possible headers
    let token = req.header('x-auth-token');
    const authHeader = req.header('Authorization');
    
    console.log('Auth middleware: x-auth-token header:', token ? 'Present' : 'Missing');
    console.log('Auth middleware: Authorization header:', authHeader ? 'Present' : 'Missing');
    
    // If no x-auth-token, check Authorization header
    if (!token && authHeader) {
      if (authHeader.startsWith('Bearer ')) {
        token = authHeader.substring(7); // Remove 'Bearer ' prefix
        console.log('Auth middleware: Extracted token from Authorization header');
      }
    }
    
    if (!token) {
      console.log('Auth middleware: No token provided');
      return res.status(401).json({ 
        success: false,
        message: 'No token, authorization denied' 
      });
    }
    
    console.log('Auth middleware: Token received:', token.substring(0, 20) + '...');
    
    // Verify token
    const jwtSecret = process.env.JWT_SECRET || 'your-secret-key-change-this';
    console.log('Auth middleware: Using JWT secret:', process.env.JWT_SECRET ? 'Environment variable' : 'Default fallback');
    
    const decoded = jwt.verify(token, jwtSecret);
    console.log('Auth middleware: Token decoded successfully for user:', decoded.id);
    
    // Get user from database
    const user = await User.findById(decoded.id).select('-password');
    if (!user) {
      console.log('Auth middleware: User not found in database');
      return res.status(401).json({ 
        success: false,
        message: 'User not found' 
      });
    }
    
    if (!user.isActive) {
      console.log('Auth middleware: User account is deactivated');
      return res.status(401).json({ 
        success: false,
        message: 'Account is deactivated' 
      });
    }
    
    console.log('Auth middleware: User authenticated:', user.email);
    
    // FIXED: Set req.user with consistent structure
    req.user = { 
      id: decoded.id, // Use 'id' consistently throughout the application
      email: user.email, 
      role: user.role 
    };
    req.userDoc = user; // Also provide the full user document
    next();
  } catch (error) {
    console.error('Auth middleware error:', error.message);
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ 
        success: false,
        message: 'Invalid token' 
      });
    } else if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        success: false,
        message: 'Token expired' 
      });
    }
    res.status(401).json({ 
      success: false,
      message: 'Token is not valid' 
    });
  }
};

module.exports = auth;
