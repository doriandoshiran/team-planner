const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const router = express.Router();

// Register endpoint
router.post('/register', async (req, res) => {
  try {
    console.log('Registration attempt:', req.body);
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Please provide all required fields' });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists with this email' });
    }

    const user = new User({
      name,
      email,
      password
    });

    await user.save();
    console.log('User created successfully:', user.email);

    res.status(201).json({ 
      message: 'User created successfully',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: 'Server error during registration' });
  }
});

// Admin-only user registration
router.post('/admin/register', async (req, res) => {
  try {
    console.log('Admin registration attempt:', req.body);
    const { name, email, password, department, position, role } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Please provide all required fields' });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists with this email' });
    }

    const user = new User({
      name,
      email,
      password,
      department: department || '',
      position: position || '',
      role: role || 'member'
    });

    await user.save();
    console.log('User created by admin:', user.email);

    res.status(201).json({ 
      message: 'User created successfully',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        department: user.department,
        position: user.position
      }
    });
  } catch (error) {
    console.error('Admin registration error:', error);
    res.status(500).json({ message: 'Server error during user creation' });
  }
});

// Login endpoint
router.post('/login', async (req, res) => {
  try {
    console.log('=== LOGIN ATTEMPT STARTED ===');
    console.log('Request body:', req.body);
    console.log('Request headers:', req.headers);
    
    const { email, password } = req.body;

    if (!email || !password) {
      console.log('Missing email or password');
      return res.status(400).json({ message: 'Please provide email and password' });
    }

    console.log('Looking for user with email:', email);
    const user = await User.findOne({ email }).select('+password');
    
    if (!user) {
      console.log('User not found:', email);
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    console.log('User found:', user.email);
    console.log('User has password field:', !!user.password);
    
    const isMatch = await user.comparePassword(password);
    console.log('Password match result:', isMatch);

    if (!isMatch) {
      console.log('Password mismatch for:', email);
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    user.lastLogin = new Date();
    await user.save();

    const token = jwt.sign(
      { userId: user._id, role: user.role },
      process.env.JWT_SECRET || 'your-secret-key-change-this',
      { expiresIn: '7d' }
    );

    console.log('Login successful for:', user.email);
    console.log('=== LOGIN ATTEMPT COMPLETED ===');

    res.json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        department: user.department,
        position: user.position
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error during login' });
  }
});

module.exports = router;
