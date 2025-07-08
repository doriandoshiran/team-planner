const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const auth = require('../middleware/auth'); // Add this import

const router = express.Router();

// Register endpoint (no auth needed)
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

// Admin-only user registration (PROTECTED)
router.post('/admin/register', auth, async (req, res) => {
  try {
    // Check if user is admin
    const currentUser = await User.findById(req.user.userId);
    if (currentUser.role !== 'admin') {
      return res.status(403).json({ message: 'Admin access required' });
    }

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
        position: user.position,
        isActive: user.isActive
      }
    });
  } catch (error) {
    console.error('Admin registration error:', error);
    res.status(500).json({ message: 'Server error during user creation' });
  }
});

// Get all users (PROTECTED)
router.get('/users', auth, async (req, res) => {
  try {
    console.log('Authenticated user requesting users:', req.user.userId);
    const users = await User.find({}, '-password');
    console.log('Fetching users, found:', users.length);
    res.json(users.map(user => ({
      id: user._id,
      name: user.name,
      email: user.email,
      department: user.department,
      position: user.position,
      role: user.role,
      isActive: user.isActive,
      createdAt: user.createdAt
    })));
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ message: 'Server error fetching users' });
  }
});

// Delete user (PROTECTED - admin only)
router.delete('/users/:id', auth, async (req, res) => {
  try {
    // Check if user is admin
    const currentUser = await User.findById(req.user.userId);
    if (currentUser.role !== 'admin') {
      return res.status(403).json({ message: 'Admin access required' });
    }

    const userId = req.params.id;
    console.log('Delete user attempt:', userId);

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    await User.findByIdAndDelete(userId);
    console.log('User deleted successfully:', user.email);

    res.json({ 
      message: 'User deleted successfully',
      deletedUser: {
        id: user._id,
        name: user.name,
        email: user.email
      }
    });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ message: 'Server error deleting user' });
  }
});

// Update user (PROTECTED - admin only)
router.put('/users/:id', auth, async (req, res) => {
  try {
    // Check if user is admin
    const currentUser = await User.findById(req.user.userId);
    if (currentUser.role !== 'admin') {
      return res.status(403).json({ message: 'Admin access required' });
    }

    const userId = req.params.id;
    const { name, email, department, position, role, isActive } = req.body;
    
    console.log('Update user attempt:', userId, req.body);

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    user.name = name || user.name;
    user.email = email || user.email;
    user.department = department !== undefined ? department : user.department;
    user.position = position !== undefined ? position : user.position;
    user.role = role || user.role;
    user.isActive = isActive !== undefined ? isActive : user.isActive;

    await user.save();
    console.log('User updated successfully:', user.email);

    res.json({
      message: 'User updated successfully',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        department: user.department,
        position: user.position,
        role: user.role,
        isActive: user.isActive
      }
    });
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({ message: 'Server error updating user' });
  }
});

// Login endpoint (no auth needed)
router.post('/login', async (req, res) => {
  try {
    console.log('=== LOGIN ATTEMPT STARTED ===');
    console.log('Request body:', req.body);
    
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

    console.log('JWT_SECRET being used:', process.env.JWT_SECRET ? 'Environment variable' : 'Default fallback');
    console.log('Token generated successfully');
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
