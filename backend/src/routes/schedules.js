const express = require('express');
const mongoose = require('mongoose');
const auth = require('../middleware/auth');
const Schedule = require('../models/Schedule');
const SwapRequest = require('../models/SwapRequest');
const Notification = require('../models/Notification');
const User = require('../models/User');
const discordService = require('../services/discordService');

const router = express.Router();

// Admin set schedule endpoint
router.post('/admin/set-schedule', auth, async (req, res) => {
  try {
    // Check if user is admin
    const currentUser = await User.findById(req.user.id);
    if (!currentUser) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    if (currentUser.role !== 'admin') {
      return res.status(403).json({ message: 'Admin access required' });
    }

    const { userId, date, type, reason } = req.body;
    
    console.log('Admin schedule update request:', { userId, date, type, reason, admin: currentUser.email });

    if (!userId || !date || !type) {
      return res.status(400).json({ message: 'User ID, date, and schedule type are required' });
    }

    // Validate schedule type
    const validTypes = ['office', 'remote', 'vacation', 'dayoff', 'sick'];
    if (!validTypes.includes(type)) {
      return res.status(400).json({ message: 'Invalid schedule type. Must be: office, remote, vacation, dayoff, or sick' });
    }

    // Prepare location data - handle day-off with reason
    let locationData = type;
    if (type === 'dayoff' && reason) {
      locationData = {
        type: 'dayoff',
        reason: reason
      };
    }

    // Update or create schedule entry
    const schedule = await Schedule.findOneAndUpdate(
      { userId: userId, date: date },
      { 
        location: locationData,
        reason: reason || null,
        createdBy: req.user.id,
        updatedAt: new Date()
      },
      { upsert: true, new: true }
    );

    // Send Discord notification for schedule update
    const updateDetails = {
      date: schedule.date,
      location: typeof schedule.location === 'object' ? 
        `${schedule.location.type}${schedule.location.reason ? ` (${schedule.location.reason})` : ''}` :
        schedule.location
    };

    // Send Discord notification (don't wait for it)
    discordService.sendScheduleUpdateNotification(userId, updateDetails)
      .catch(error => console.error('Discord notification failed:', error));

    console.log(`Admin ${currentUser.email} set schedule for user ${userId} on ${date}: ${type}${reason ? ` (${reason})` : ''}`);

    res.json({
      success: true,
      message: 'Schedule updated successfully',
      schedule: {
        userId: schedule.userId,
        date: schedule.date,
        type: typeof schedule.location === 'object' ? schedule.location.type : schedule.location,
        location: schedule.location,
        reason: schedule.reason,
        updatedAt: schedule.updatedAt
      }
    });

  } catch (error) {
    console.error('Error setting admin schedule:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error setting schedule' 
    });
  }
});

// Admin remove schedule endpoint
router.delete('/admin/remove-schedule', auth, async (req, res) => {
  try {
    // Check if user is admin
    const currentUser = await User.findById(req.user.id);
    if (!currentUser) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    if (currentUser.role !== 'admin') {
      return res.status(403).json({ message: 'Admin access required' });
    }

    const { userId, date } = req.body;
    
    console.log('Admin remove schedule request:', { userId, date, admin: currentUser.email });

    if (!userId || !date) {
      return res.status(400).json({ message: 'User ID and date are required' });
    }

    // Remove the specific schedule entry
    const result = await Schedule.findOneAndDelete({
      userId: userId,
      date: date
    });

    if (!result) {
      return res.status(404).json({ message: 'Schedule entry not found' });
    }

    console.log(`Admin ${currentUser.email} removed schedule entry for user ${userId} on ${date}`);

    res.json({
      success: true,
      message: 'Schedule entry removed successfully',
      removedSchedule: {
        userId: result.userId,
        date: result.date,
        location: result.location
      }
    });

  } catch (error) {
    console.error('Error removing schedule entry:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error removing schedule entry' 
    });
  }
});

// Get user schedule - FIXED: Proper database query
router.get('/my-schedule', auth, async (req, res) => {
  try {
    const userId = req.query.userId || req.user.id;
    const currentDate = new Date();
    const month = parseInt(req.query.month) || (currentDate.getMonth() + 1);
    const year = parseInt(req.query.year) || currentDate.getFullYear();

    console.log(`Fetching schedule for user: ${userId}, month: ${month}, year: ${year}`);

    if (!userId) {
      return res.status(400).json({ 
        success: false,
        message: 'User ID is required' 
      });
    }

    // Create date range for the month
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);

    // Query the Schedule collection properly
    const schedules = await Schedule.find({
      userId: userId,
      date: {
        $gte: startDate.toISOString().split('T')[0],
        $lte: endDate.toISOString().split('T')[0]
      }
    }).sort({ date: 1 });

    console.log(`Found ${schedules.length} schedule entries for user ${userId}`);

    // Convert to object format expected by frontend
    const scheduleObject = {};
    schedules.forEach(schedule => {
      scheduleObject[schedule.date] = schedule.location;
    });

    console.log('Returning schedule object:', scheduleObject);
    res.json({
      success: true,
      data: scheduleObject
    });

  } catch (error) {
    console.error('Error fetching schedule:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error fetching schedule' 
    });
  }
});

// Get user schedule by ID
router.get('/user/:userId', auth, async (req, res) => {
  try {
    const { userId } = req.params;
    const { month, year } = req.query;

    console.log(`Fetching schedule for user: ${userId}, month: ${month}, year: ${year}`);

    // Build date filter
    const dateFilter = {};
    if (month && year) {
      const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
      const endDate = `${year}-${String(month).padStart(2, '0')}-31`;
      dateFilter.date = { $gte: startDate, $lte: endDate };
    }

    // Get schedules for the user
    const schedules = await Schedule.find({
      userId,
      ...dateFilter
    }).sort({ date: 1 });

    console.log(`Found ${schedules.length} schedule entries for user ${userId}`);

    // Convert to object with date as key
    const scheduleObject = {};
    schedules.forEach(schedule => {
      scheduleObject[schedule.date] = schedule.location;
    });

    res.status(200).json({
      success: true,
      schedule: scheduleObject
    });
  } catch (error) {
    console.error('Error fetching user schedule:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error fetching schedule'
    });
  }
});

// Create swap request - FIXED VERSION
router.post('/swap-request', auth, async (req, res) => {
  try {
    const { targetUserId, requestedDate, reason } = req.body;
    const requesterId = req.user.id;

    console.log('Swap request received:', {
      targetUserId,
      requestedDate,
      reason,
      requesterId
    });

    // Validate required fields
    if (!targetUserId || !requestedDate) {
      return res.status(400).json({ message: 'Target user and requested date are required' });
    }

    // Validate that user is not requesting swap with themselves
    if (requesterId === targetUserId) {
      return res.status(400).json({ message: 'Cannot create swap request with yourself' });
    }

    // Validate ObjectId format
    if (!mongoose.Types.ObjectId.isValid(targetUserId)) {
      return res.status(400).json({ message: 'Invalid target user ID format' });
    }

    if (!mongoose.Types.ObjectId.isValid(requesterId)) {
      return res.status(400).json({ message: 'Invalid requester ID format' });
    }

    // Validate date format (YYYY-MM-DD)
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(requestedDate)) {
      return res.status(400).json({ message: 'Invalid date format. Use YYYY-MM-DD' });
    }

    // Check if swap request already exists
    const existingRequest = await SwapRequest.findOne({
      requester: requesterId,
      targetUser: targetUserId,
      requestedDate: requestedDate,
      status: 'pending'
    });

    if (existingRequest) {
      return res.status(400).json({ message: 'A pending swap request already exists for this date and user' });
    }

    // Verify both users exist
    const requester = await User.findById(requesterId).select('name email discordId');
    const targetUser = await User.findById(targetUserId).select('name email discordId');

    if (!requester) {
      return res.status(404).json({ message: 'Requester user not found' });
    }

    if (!targetUser) {
      return res.status(404).json({ message: 'Target user not found' });
    }

    // Create new swap request
    const swapRequest = new SwapRequest({
      requester: requesterId,
      targetUser: targetUserId,
      requestedDate: requestedDate,
      reason: reason || '',
      status: 'pending'
    });

    await swapRequest.save();

    // Create in-app notification - FIXED: Use 'user' instead of 'userId'
    const notification = new Notification({
      user: targetUserId,  // ✅ Changed from 'userId' to 'user'
      type: 'swap_request',
      title: 'New Shift Swap Request',
      message: `${requester.name} wants to swap shifts with you on ${requestedDate}${reason ? `: ${reason}` : ''}`,
      relatedId: swapRequest._id,
      relatedModel: 'SwapRequest',
      isActive: true,
      isRead: false
    });

    await notification.save();

    // Send Discord notification (don't wait for it)
    discordService.sendSwapRequestNotification(swapRequest, requester, targetUser)
      .catch(error => console.error('Discord notification failed:', error));

    console.log('Shift swap request created with notification:', swapRequest._id);

    res.status(201).json({
      success: true,
      message: 'Swap request created successfully',
      swapRequest: {
        id: swapRequest._id,
        targetUser: targetUser.name,
        requestedDate: requestedDate,
        reason: reason,
        status: 'pending'
      }
    });

  } catch (error) {
    console.error('Error creating swap request:', error);
    
    // Enhanced error handling
    if (error.name === 'ValidationError') {
      console.error('Validation Error Details:', error.errors);
      return res.status(400).json({ 
        success: false,
        message: 'Validation error: ' + Object.values(error.errors).map(e => e.message).join(', ')
      });
    }
    
    if (error.name === 'CastError') {
      console.error('Cast Error Details:', error);
      return res.status(400).json({ 
        success: false,
        message: 'Invalid ID format provided'
      });
    }
    
    res.status(500).json({ 
      success: false,
      message: 'Server error creating swap request',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Respond to swap request (approve/deny)
router.put('/swap-request/:requestId/respond', auth, async (req, res) => {
  try {
    const { requestId } = req.params;
    const { action, reason } = req.body;
    const responderId = req.user.id;

    console.log(`Swap request response: ${action} for request ${requestId} by user ${responderId}`);

    if (!['approve', 'deny'].includes(action)) {
      return res.status(400).json({ message: 'Action must be either "approve" or "deny"' });
    }

    const swapRequest = await SwapRequest.findById(requestId)
      .populate('requester', 'name email discordId')
      .populate('targetUser', 'name email');

    if (!swapRequest) {
      return res.status(404).json({ message: 'Swap request not found' });
    }

    if (swapRequest.status !== 'pending') {
      return res.status(400).json({ 
        message: `Swap request has already been ${swapRequest.status}`,
        currentStatus: swapRequest.status
      });
    }

    if (swapRequest.targetUser._id.toString() !== responderId) {
      return res.status(403).json({ message: 'You can only respond to swap requests directed to you' });
    }

    swapRequest.status = action === 'approve' ? 'approved' : 'denied';
    swapRequest.respondedAt = new Date();
    swapRequest.responseReason = reason;

    if (action === 'approve') {
      const requestedDate = swapRequest.requestedDate;
      
      const requesterSchedule = await Schedule.findOne({
        userId: swapRequest.requester._id,
        date: requestedDate
      });
      
      const targetSchedule = await Schedule.findOne({
        userId: swapRequest.targetUser._id,
        date: requestedDate
      });

      if (requesterSchedule && targetSchedule) {
        const tempLocation = requesterSchedule.location;
        requesterSchedule.location = targetSchedule.location;
        targetSchedule.location = tempLocation;

        await requesterSchedule.save();
        await targetSchedule.save();

        console.log(`Schedule swap completed for date ${requestedDate}`);
      }
    }

    await swapRequest.save();

    // Create response notification - FIXED: Use 'user' instead of 'userId'
    const notification = new Notification({
      user: swapRequest.requester._id,  // ✅ Changed from 'userId' to 'user'
      type: 'swap_response',
      title: `Shift Swap ${action === 'approve' ? 'Approved' : 'Denied'}`,
      message: action === 'approve' 
        ? `Your shift swap request for ${swapRequest.requestedDate} has been approved by ${swapRequest.targetUser.name}`
        : `Your shift swap request for ${swapRequest.requestedDate} has been denied by ${swapRequest.targetUser.name}${reason ? `: ${reason}` : ''}`,
      relatedId: swapRequest._id,
      relatedModel: 'SwapRequest',
      isActive: true,
      isRead: false
    });

    await notification.save();

    // Send Discord notification (don't wait for it)
    discordService.sendSwapResponseNotification(swapRequest, action)
      .catch(error => console.error('Discord notification failed:', error));

    // Mark original notification as processed
    await Notification.findOneAndUpdate(
      { 
        relatedId: swapRequest._id,
        relatedModel: 'SwapRequest',
        type: 'swap_request'
      },
      { 
        isRead: true,
        processedAt: new Date()
      }
    );

    console.log(`Swap request ${action}d successfully and notifications updated`);

    res.json({
      success: true,
      message: `Swap request ${action}d successfully`,
      swapRequest: {
        id: swapRequest._id,
        status: swapRequest.status,
        requestedDate: swapRequest.requestedDate,
        requester: swapRequest.requester.name,
        targetUser: swapRequest.targetUser.name,
        respondedAt: swapRequest.respondedAt
      }
    });

  } catch (error) {
    console.error('Error responding to swap request:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error responding to swap request' 
    });
  }
});

// Get notifications for current user - FIXED: Use 'user' instead of 'userId'
router.get('/notifications', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    
    console.log(`Fetching notifications for user: ${userId}`);
    
    if (!userId) {
      return res.status(400).json({ 
        success: false,
        message: 'User ID not found in request' 
      });
    }

    const notifications = await Notification.find({
      user: userId,  // ✅ Changed from 'userId' to 'user'
      isActive: { $ne: false }
    })
    .sort({ createdAt: -1 })
    .limit(50);

    console.log(`Found ${notifications.length} notifications for user ${userId}`);
    
    // Filter out processed notifications and only return active ones
    const activeNotifications = notifications.filter(notification => {
      if (notification.type === 'swap_request' && notification.relatedId) {
        return !notification.processedAt;
      }
      return true;
    });

    console.log(`Returning ${activeNotifications.length} active notifications`);
    
    res.json({
      success: true,
      data: activeNotifications
    });
    
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error fetching notifications' 
    });
  }
});

// Mark notification as read - FIXED: Use 'user' instead of 'userId'
router.put('/notifications/:notificationId/read', auth, async (req, res) => {
  try {
    const { notificationId } = req.params;
    const userId = req.user.id;

    const notification = await Notification.findOneAndUpdate(
      { 
        _id: notificationId, 
        user: userId  // ✅ Changed from 'userId' to 'user'
      },
      { 
        isRead: true,
        readAt: new Date()
      },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({ 
        success: false,
        message: 'Notification not found' 
      });
    }

    console.log(`Notification ${notificationId} marked as read by user ${userId}`);

    res.json({ 
      success: true,
      message: 'Notification marked as read',
      notification: {
        id: notification._id,
        isRead: notification.isRead,
        readAt: notification.readAt
      }
    });

  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error marking notification as read' 
    });
  }
});

module.exports = router;
