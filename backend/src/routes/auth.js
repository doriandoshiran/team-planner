const express = require('express');
const multer = require('multer');
const router = express.Router();
const {
  register,
  login,
  getMe,
  updateDetails,
  updatePassword,
  updatePreferences,
  logout
} = require('../controllers/authController');
const auth = require('../middleware/auth');
const User = require('../models/User');

// Configure multer for avatar uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'), false);
    }
  }
});

// Public routes
router.post('/register', register);
router.post('/login', login);

// Protected routes - Core Authentication
router.get('/me', auth, getMe);
router.put('/updatedetails', auth, updateDetails);
router.put('/updatepassword', auth, updatePassword);
router.put('/preferences', auth, updatePreferences);
router.get('/logout', auth, logout);

// Profile management routes
router.put('/profile', auth, async (req, res) => {
  try {
    const { bio, contacts, cybersecuritySkills, ctfs } = req.body;

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Update fields
    if (bio !== undefined) user.bio = bio;
    if (contacts !== undefined) user.contacts = contacts;
    if (cybersecuritySkills !== undefined) user.cybersecuritySkills = cybersecuritySkills;
    if (ctfs !== undefined) user.ctfs = ctfs;

    await user.save();

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      user
    });
  } catch (error) {
    console.error('Error updating profile:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error updating profile'
    });
  }
});

// Avatar upload route
router.post('/upload-avatar', auth, upload.single('avatar'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Store avatar data
    user.avatar = {
      data: req.file.buffer,
      contentType: req.file.mimetype
    };

    await user.save();

    // Generate avatar URL for response
    const avatarUrl = `data:${user.avatar.contentType};base64,${user.avatar.data.toString('base64')}`;

    console.log('Avatar uploaded successfully for:', user.email);

    res.status(200).json({
      success: true,
      message: 'Avatar uploaded successfully',
      avatarUrl: avatarUrl
    });
  } catch (error) {
    console.error('Error uploading avatar:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error uploading avatar'
    });
  }
});

// Avatar route - serve avatar images
router.get('/avatar/:userId', auth, async (req, res) => {
  try {
    const user = await User.findById(req.params.userId);
    if (!user || !user.avatar || !user.avatar.data) {
      return res.status(404).json({
        success: false,
        message: 'Avatar not found'
      });
    }

    res.set('Content-Type', user.avatar.contentType);
    res.send(user.avatar.data);
  } catch (error) {
    console.error('Error fetching avatar:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// Get all users (admin only)
router.get('/users', auth, async (req, res) => {
  try {
    console.log('Authenticated user requesting users:', req.user.id);
    
    // Get users without password field
    const users = await User.find({}, { password: 0 }).sort({ createdAt: -1 });
    console.log('Fetching users, found:', users.length);
    
    res.status(200).json({
      success: true,
      count: users.length,
      data: users
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// Update user role (admin only)
router.put('/users/:userId/role', auth, async (req, res) => {
  try {
    const { role } = req.body;
    
    // Check if current user is admin
    const currentUser = await User.findById(req.user.id);
    if (currentUser.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Admin privileges required.'
      });
    }

    const user = await User.findByIdAndUpdate(
      req.params.userId,
      { role },
      { new: true, runValidators: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'User role updated successfully',
      user
    });
  } catch (error) {
    console.error('Error updating user role:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error updating user role'
    });
  }
});

// Deactivate/activate user (admin only)
router.put('/users/:userId/status', auth, async (req, res) => {
  try {
    const { isActive } = req.body;
    
    // Check if current user is admin
    const currentUser = await User.findById(req.user.id);
    if (currentUser.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Admin privileges required.'
      });
    }

    const user = await User.findByIdAndUpdate(
      req.params.userId,
      { isActive },
      { new: true, runValidators: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.status(200).json({
      success: true,
      message: `User ${isActive ? 'activated' : 'deactivated'} successfully`,
      user
    });
  } catch (error) {
    console.error('Error updating user status:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error updating user status'
    });
  }
});

// Error handling middleware for multer
router.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: 'File too large. Maximum size is 5MB.'
      });
    }
  }
  
  if (error.message === 'Only image files are allowed') {
    return res.status(400).json({
      success: false,
      message: 'Only image files are allowed'
    });
  }
  
  next(error);
});

module.exports = router;
