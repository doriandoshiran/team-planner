const express = require('express');
const Schedule = require('../models/Schedule');
const User = require('../models/User');
const auth = require('../middleware/auth');
const router = express.Router();

// Get user's schedule
router.get('/my-schedule', auth, async (req, res) => {
  try {
    const schedules = await Schedule.find({ userId: req.user.userId })
      .sort({ date: 1 });
    
    // Convert to object format for frontend
    const scheduleObj = {};
    schedules.forEach(schedule => {
      if (schedule.location === 'dayoff' && schedule.reason) {
        scheduleObj[schedule.date] = {
          type: schedule.location,
          reason: schedule.reason
        };
      } else {
        scheduleObj[schedule.date] = schedule.location;
      }
    });
    
    res.json(scheduleObj);
  } catch (error) {
    console.error('Error fetching user schedule:', error);
    res.status(500).json({ message: 'Server error fetching schedule' });
  }
});

// Get specific user's schedule (admin only)
router.get('/user/:userId', auth, async (req, res) => {
  try {
    const currentUser = await User.findById(req.user.userId);
    if (currentUser.role !== 'admin') {
      return res.status(403).json({ message: 'Admin access required' });
    }

    const schedules = await Schedule.find({ userId: req.params.userId })
      .sort({ date: 1 });
    
    // Convert to object format for frontend
    const scheduleObj = {};
    schedules.forEach(schedule => {
      if (schedule.location === 'dayoff' && schedule.reason) {
        scheduleObj[schedule.date] = {
          type: schedule.location,
          reason: schedule.reason
        };
      } else {
        scheduleObj[schedule.date] = schedule.location;
      }
    });
    
    res.json(scheduleObj);
  } catch (error) {
    console.error('Error fetching user schedule:', error);
    res.status(500).json({ message: 'Server error fetching schedule' });
  }
});

// Get team schedules (for team view)
router.get('/team-schedules', auth, async (req, res) => {
  try {
    const { department } = req.query;
    
    // Build query based on user role and department
    let userQuery = {};
    const currentUser = await User.findById(req.user.userId);
    
    if (currentUser.role !== 'admin' && currentUser.department) {
      userQuery.department = currentUser.department;
    }
    
    if (department) {
      userQuery.department = department;
    }
    
    const users = await User.find(userQuery)
      .select('name email department role')
      .sort({ name: 1 });
    
    // Get schedules for all users
    const userIds = users.map(user => user._id);
    const schedules = await Schedule.find({ userId: { $in: userIds } });
    
    // Group schedules by user
    const schedulesByUser = {};
    schedules.forEach(schedule => {
      if (!schedulesByUser[schedule.userId]) {
        schedulesByUser[schedule.userId] = {};
      }
      
      if (schedule.location === 'dayoff' && schedule.reason) {
        schedulesByUser[schedule.userId][schedule.date] = {
          type: schedule.location,
          reason: schedule.reason
        };
      } else {
        schedulesByUser[schedule.userId][schedule.date] = schedule.location;
      }
    });
    
    // Combine user data with schedules
    const teamSchedules = users.map(user => ({
      id: user._id,
      name: user.name,
      email: user.email,
      department: user.department,
      role: user.role,
      schedule: schedulesByUser[user._id] || {},
      canSwapWith: user._id.toString() !== req.user.userId
    }));
    
    res.json(teamSchedules);
  } catch (error) {
    console.error('Error fetching team schedules:', error);
    res.status(500).json({ message: 'Server error fetching team schedules' });
  }
});

// Admin: Set schedule for user (bulk operation)
router.post('/admin/set-schedule', auth, async (req, res) => {
  try {
    const { userId, schedules } = req.body;
    
    // Verify admin access
    const currentUser = await User.findById(req.user.userId);
    if (currentUser.role !== 'admin') {
      return res.status(403).json({ message: 'Admin access required' });
    }
    
    // Verify target user exists
    const targetUser = await User.findById(userId);
    if (!targetUser) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Process each schedule entry
    const results = [];
    for (const [date, scheduleData] of Object.entries(schedules)) {
      try {
        let location, reason;
        
        if (typeof scheduleData === 'object' && scheduleData.type) {
          location = scheduleData.type;
          reason = scheduleData.reason;
        } else {
          location = scheduleData;
        }
        
        // Upsert schedule entry
        const schedule = await Schedule.findOneAndUpdate(
          { userId, date },
          {
            userId,
            date,
            location,
            reason,
            createdBy: req.user.userId,
            updatedAt: new Date()
          },
          { upsert: true, new: true }
        );
        
        results.push(schedule);
      } catch (error) {
        console.error(`Error setting schedule for ${date}:`, error);
      }
    }
    
    res.json({ 
      message: 'Schedule updated successfully',
      updated: results.length
    });
  } catch (error) {
    console.error('Error setting schedule:', error);
    res.status(500).json({ message: 'Server error setting schedule' });
  }
});

// Admin: Clear schedule for user/month
router.delete('/admin/clear-schedule', auth, async (req, res) => {
  try {
    const { userId, year, month } = req.body;
    
    // Verify admin access
    const currentUser = await User.findById(req.user.userId);
    if (currentUser.role !== 'admin') {
      return res.status(403).json({ message: 'Admin access required' });
    }
    
    // Build date range for the month
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
    const endDate = `${year}-${String(month).padStart(2, '0')}-31`;
    
    const result = await Schedule.deleteMany({
      userId,
      date: { $gte: startDate, $lte: endDate }
    });
    
    res.json({ 
      message: 'Schedule cleared successfully',
      deleted: result.deletedCount
    });
  } catch (error) {
    console.error('Error clearing schedule:', error);
    res.status(500).json({ message: 'Server error clearing schedule' });
  }
});

// Request shift swap
router.post('/swap-request', auth, async (req, res) => {
  try {
    const { targetUserId, requestedDate, reason } = req.body;
    
    const requester = await User.findById(req.user.userId);
    const targetUser = await User.findById(targetUserId);
    
    if (!targetUser) {
      return res.status(404).json({ message: 'Target user not found' });
    }
    
    // Here you would typically save to database
    // For now, we'll simulate the request
    const swapRequest = {
      id: Date.now().toString(),
      requesterId: req.user.userId,
      requesterName: requester.name,
      targetUserId,
      targetUserName: targetUser.name,
      requestedDate,
      reason,
      status: 'pending',
      createdAt: new Date()
    };
    
    console.log('Shift swap request created:', swapRequest);
    res.status(201).json({ 
      message: 'Shift swap request sent successfully',
      request: swapRequest
    });
  } catch (error) {
    console.error('Error creating swap request:', error);
    res.status(500).json({ message: 'Server error creating swap request' });
  }
});

module.exports = router;
