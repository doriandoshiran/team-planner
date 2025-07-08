const jwt = require('jsonwebtoken');
const User = require('../models/User');

const auth = async (req, res, next) => {
  try {
    // Get token from x-auth-token header (to match frontend)
    const token = req.header('x-auth-token');
    
    console.log('Auth middleware: Checking for token...');
    console.log('Auth middleware: x-auth-token header:', token ? 'Present' : 'Missing');
    
    if (!token) {
      console.log('Auth middleware: No token provided');
      return res.status(401).json({ message: 'Access denied. No token provided.' });
    }

    console.log('Auth middleware: Token received:', token.substring(0, 20) + '...');
    
    const secret = process.env.JWT_SECRET || 'your-secret-key-change-this';
    console.log('Auth middleware: Using JWT secret:', secret === process.env.JWT_SECRET ? 'Environment variable' : 'Default fallback');
    
    const decoded = jwt.verify(token, secret);
    console.log('Auth middleware: Token decoded successfully for user:', decoded.userId);
    
    const user = await User.findById(decoded.userId);

    if (!user) {
      console.log('Auth middleware: User not found for ID:', decoded.userId);
      return res.status(401).json({ message: 'Invalid token - user not found.' });
    }

    console.log('Auth middleware: User authenticated:', user.email);
    req.user = decoded;
    next();
  } catch (error) {
    console.error('Auth middleware error:', error.message);
    res.status(401).json({ message: 'Invalid token.' });
  }
};

module.exports = auth;
