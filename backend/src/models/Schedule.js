const mongoose = require('mongoose');

const scheduleSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  date: {
    type: String, // Format: YYYY-MM-DD
    required: true
  },
  location: {
    type: String,
    enum: ['office', 'remote', 'vacation', 'dayoff'],
    required: true
  },
  reason: {
    type: String, // For dayoff types
    required: false
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Compound index to ensure one schedule per user per date
scheduleSchema.index({ userId: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('Schedule', scheduleSchema);
