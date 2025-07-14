const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const User = require('../models/User');

// Link Discord account
router.post('/link', auth, async (req, res) => {
  try {
    const { discordId } = req.body;
    
    if (!discordId) {
      return res.status(400).json({ message: 'Discord ID is required' });
    }

    console.log(`Linking Discord ID ${discordId} to user ${req.user.id}`);

    // Check if Discord ID is already linked to another user
    const existingUser = await User.findOne({ discordId, _id: { $ne: req.user.id } });
    if (existingUser) {
      return res.status(400).json({ message: 'This Discord ID is already linked to another account' });
    }

    // Update user with Discord ID
    const updatedUser = await User.findByIdAndUpdate(
      req.user.id, 
      { discordId },
      { new: true }
    );

    if (!updatedUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    console.log(`Discord account linked: ${updatedUser.email} -> ${discordId}`);
    res.json({ message: 'Discord account linked successfully' });
  } catch (error) {
    console.error('Error linking Discord account:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Unlink Discord account
router.delete('/unlink', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    await User.findByIdAndUpdate(req.user.id, { $unset: { discordId: 1 } });
    console.log(`Discord account unlinked for user: ${user.email}`);
    res.json({ message: 'Discord account unlinked successfully' });
  } catch (error) {
    console.error('Error unlinking Discord account:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Send test notification
router.post('/test-notification', auth, async (req, res) => {
  try {
    const { message } = req.body;
    
    if (!message) {
      return res.status(400).json({ message: 'Message is required' });
    }

    console.log(`Test notification request from user ID: ${req.user.id}`);
    
    // Find user with proper error handling
    const user = await User.findById(req.user.id);
    if (!user) {
      console.error(`User not found for ID: ${req.user.id}`);
      return res.status(404).json({ message: 'User not found' });
    }

    console.log(`Found user: ${user.email}, Discord ID: ${user.discordId || 'Not linked'}`);

    // Check if Discord account is linked
    if (!user.discordId) {
      console.log(`Discord account not linked for user: ${user.email}`);
      return res.status(400).json({ message: 'Discord account not linked' });
    }

    // Try to get Discord service
    let discordService;
    try {
      discordService = require('../services/discordService');
    } catch (error) {
      console.error('Discord service not available:', error);
      return res.status(503).json({ message: 'Discord service is not available' });
    }

    // Check if Discord service is ready
    if (!discordService.isReady) {
      console.error('Discord service is not ready');
      return res.status(503).json({ message: 'Discord service is not ready' });
    }

    console.log(`Sending test notification to Discord ID: ${user.discordId}`);
    
    // Send test notification through Discord service
    const success = await discordService.sendTestNotification(user.discordId, message);
    
    if (success) {
      console.log(`Test notification sent successfully to ${user.email}`);
      res.json({ success: true, message: 'Test notification sent successfully' });
    } else {
      console.error(`Failed to send test notification to ${user.email}`);
      res.status(500).json({ success: false, message: 'Failed to send test notification' });
    }
  } catch (error) {
    console.error('Error sending test notification:', error);
    res.status(500).json({ message: 'Server error: ' + error.message });
  }
});

module.exports = router;
