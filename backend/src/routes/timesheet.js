const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const TimeEntry = require('../models/TimeEntry');

// All routes require authentication
router.use(protect);

// Get time entries
router.get('/', async (req, res) => {
  try {
    const { startDate, endDate, project, status } = req.query;
    const query = { user: req.user.id };

    if (startDate && endDate) {
      query.date = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    if (project) query.project = project;
    if (status) query.status = status;

    const entries = await TimeEntry.find(query)
      .populate('task', 'title')
      .populate('project', 'name color')
      .sort('date');

    res.json({
      success: true,
      entries
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Create time entry
router.post('/', async (req, res) => {
  try {
    const entry = await TimeEntry.create({
      ...req.body,
      user: req.user.id
    });

    res.status(201).json({
      success: true,
      data: entry
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Update time entry
router.put('/:id', async (req, res) => {
  try {
    const entry = await TimeEntry.findOneAndUpdate(
      { _id: req.params.id, user: req.user.id },
      req.body,
      { new: true, runValidators: true }
    );

    if (!entry) {
      return res.status(404).json({
        success: false,
        message: 'Time entry not found'
      });
    }

    res.json({
      success: true,
      data: entry
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Delete time entry
router.delete('/:id', async (req, res) => {
  try {
    const entry = await TimeEntry.findOneAndDelete({
      _id: req.params.id,
      user: req.user.id
    });

    if (!entry) {
      return res.status(404).json({
        success: false,
        message: 'Time entry not found'
      });
    }

    res.json({
      success: true,
      message: 'Time entry deleted'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Get weekly summary
router.get('/weekly', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    const summary = await TimeEntry.getWeeklyTimesheet(
      req.user.id,
      startDate,
      endDate
    );

    res.json({
      success: true,
      summary
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Submit timesheet for approval
router.post('/submit', async (req, res) => {
  try {
    const { startDate, endDate } = req.body;
    
    const result = await TimeEntry.updateMany(
      {
        user: req.user.id,
        date: { $gte: new Date(startDate), $lte: new Date(endDate) },
        status: 'draft'
      },
      { status: 'submitted' }
    );

    res.json({
      success: true,
      message: `${result.modifiedCount} entries submitted for approval`
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

module.exports = router;