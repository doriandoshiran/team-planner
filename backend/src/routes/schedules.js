const express = require('express');
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
    const currentUser = await User.findById(req.user.userId);
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
        createdBy: req.user.userId,
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
    res.status(500).json({ message: 'Server error setting schedule' });
  }
});

// Admin remove schedule endpoint
router.delete('/admin/remove-schedule', auth, async (req, res) => {
  try {
    // Check if user is admin
    const currentUser = await User.findById(req.user.userId);
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
      message: 'Schedule entry removed successfully',
      removedSchedule: {
        userId: result.userId,
        date: result.date,
        location: result.location
      }
    });

  } catch (error) {
    console.error('Error removing schedule entry:', error);
    res.status(500).json({ message: 'Server error removing schedule entry' });
  }
});

// Get my schedule
router.get('/my-schedule', auth, async (req, res) => {
  try {
    const userId = req.query.userId || req.user.userId;
    const month = parseInt(req.query.month);
    const year = parseInt(req.query.year);

    console.log(`Fetching schedule for user: ${userId}, month: ${month}, year: ${year}`);

    if (!month || !year) {
      return res.status(400).json({ message: 'Month and year are required' });
    }

    // Create date range for the month
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);

    const schedules = await Schedule.find({
      userId: userId,
      date: {
        $gte: startDate.toISOString().split('T')[0],
        $lte: endDate.toISOString().split('T')[0]
      }
    }).sort({ date: 1 });

    console.log(`Found schedules: ${schedules.length}`);

    // Convert to object format expected by frontend
    const scheduleObject = {};
    schedules.forEach(schedule => {
      scheduleObject[schedule.date] = schedule.location;
    });

    console.log('Returning schedule object:', scheduleObject);
    res.json(scheduleObject);

  } catch (error) {
    console.error('Error fetching schedule:', error);
    res.status(500).json({ message: 'Server error fetching schedule' });
  }
});

// Create swap request
router.post('/swap-request', auth, async (req, res) => {
  try {
    const { targetUserId, requestedDate, reason } = req.body;
    const requesterId = req.user.userId;

    console.log('Swap request received:', {
      targetUserId,
      requestedDate,
      reason
    });

    if (!targetUserId || !requestedDate) {
      return res.status(400).json({ message: 'Target user and requested date are required' });
    }

    if (requesterId === targetUserId) {
      return res.status(400).json({ message: 'Cannot create swap request with yourself' });
    }

    const existingRequest = await SwapRequest.findOne({
      requester: requesterId,
      targetUser: targetUserId,
      requestedDate: requestedDate,
      status: 'pending'
    });

    if (existingRequest) {
      return res.status(400).json({ message: 'A pending swap request already exists for this date and user' });
    }

    const requester = await User.findById(requesterId).select('name email discordId');
    const targetUser = await User.findById(targetUserId).select('name email discordId');

    if (!targetUser) {
      return res.status(404).json({ message: 'Target user not found' });
    }

    const swapRequest = new SwapRequest({
      requester: requesterId,
      targetUser: targetUserId,
      requestedDate: requestedDate,
      reason: reason,
      status: 'pending'
    });

    await swapRequest.save();

    // Create in-app notification
    const notification = new Notification({
      user: targetUserId,
      type: 'swap_request',
      title: 'New Shift Swap Request',
      message: `${requester.name} wants to swap shifts with you on ${requestedDate}${reason ? `: ${reason}` : ''}`,
      relatedId: swapRequest._id,
      relatedModel: 'SwapRequest'
    });

    await notification.save();

    // Send Discord notification (don't wait for it)
    discordService.sendSwapRequestNotification(swapRequest, requester, targetUser)
      .catch(error => console.error('Discord notification failed:', error));

    console.log('Shift swap request created with notification:', swapRequest._id);

    res.status(201).json({
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
    res.status(500).json({ message: 'Server error creating swap request' });
  }
});

// Respond to swap request (approve/deny)
router.put('/swap-request/:requestId/respond', auth, async (req, res) => {
  try {
    const { requestId } = req.params;
    const { action, reason } = req.body;
    const responderId = req.user.userId;

    console.log(`Swap request response: ${action} for request ${requestId} by user ${responderId}`);

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

    // Create response notification
    const notification = new Notification({
      user: swapRequest.requester._id,
      type: 'swap_response',
      title: `Shift Swap ${action === 'approve' ? 'Approved' : 'Denied'}`,
      message: action === 'approve' 
        ? `Your shift swap request for ${swapRequest.requestedDate} has been approved by ${swapRequest.targetUser.name}`
        : `Your shift swap request for ${swapRequest.requestedDate} has been denied by ${swapRequest.targetUser.name}${reason ? `: ${reason}` : ''}`,
      relatedId: swapRequest._id,
      relatedModel: 'SwapRequest'
    });

    await notification.save();

    // Send Discord notification (don't wait for it)
    discordService.sendSwapResponseNotification(swapRequest, action)
      .catch(error => console.error('Discord notification failed:', error));

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
    res.status(500).json({ message: 'Server error responding to swap request' });
  }
});

// Get notifications for current user
router.get('/notifications', auth, async (req, res) => {
  try {
    const userId = req.user.userId;
    
    console.log(`Fetching notifications for user: ${userId}`);
    
    const notifications = await Notification.find({
      user: userId
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
    res.json(activeNotifications);
    
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ message: 'Server error fetching notifications' });
  }
});

// Mark notification as read
router.put('/notifications/:notificationId/read', auth, async (req, res) => {
  try {
    const { notificationId } = req.params;
    const userId = req.user.userId;

    const notification = await Notification.findOneAndUpdate(
      { 
        _id: notificationId, 
        user: userId 
      },
      { 
        isRead: true,
        readAt: new Date()
      },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }

    console.log(`Notification ${notificationId} marked as read by user ${userId}`);

    res.json({ 
      message: 'Notification marked as read',
      notification: {
        id: notification._id,
        isRead: notification.isRead,
        readAt: notification.readAt
      }
    });

  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({ message: 'Server error marking notification as read' });
  }
});

module.exports = router;
