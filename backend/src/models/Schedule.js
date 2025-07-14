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
    type: mongoose.Schema.Types.Mixed, // Changed to Mixed to support complex types
    required: true
  },
  reason: {
    type: String,
    trim: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Compound index for efficient queries
scheduleSchema.index({ userId: 1, date: 1 }, { unique: true });
scheduleSchema.index({ date: 1 });
scheduleSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model('Schedule', scheduleSchema);
