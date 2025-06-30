const mongoose = require('mongoose');

const timeEntrySchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  task: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Task',
    default: null
  },
  project: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    required: true
  },
  date: {
    type: Date,
    required: true,
    get: (date) => date ? date.toISOString().split('T')[0] : null
  },
  hours: {
    type: Number,
    required: [true, 'Hours are required'],
    min: [0, 'Hours cannot be negative'],
    max: [24, 'Hours cannot exceed 24 per day']
  },
  description: {
    type: String,
    trim: true,
    default: ''
  },
  type: {
    type: String,
    enum: ['regular', 'overtime', 'holiday'],
    default: 'regular'
  },
  billable: {
    type: Boolean,
    default: true
  },
  status: {
    type: String,
    enum: ['draft', 'submitted', 'approved', 'rejected'],
    default: 'draft'
  },
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  approvedAt: {
    type: Date,
    default: null
  },
  rejectionReason: {
    type: String,
    default: null
  },
  tags: [{
    type: String,
    trim: true
  }],
  location: {
    type: String,
    enum: ['office', 'remote', 'client', 'other'],
    default: 'office'
  }
}, {
  timestamps: true,
  toJSON: { getters: true }
});

// Compound index for user-date uniqueness per task
timeEntrySchema.index({ user: 1, date: 1, task: 1 });
timeEntrySchema.index({ user: 1, date: 1 });
timeEntrySchema.index({ project: 1, date: 1 });
timeEntrySchema.index({ status: 1, date: 1 });

// Static method to get weekly timesheet
timeEntrySchema.statics.getWeeklyTimesheet = async function(userId, startDate, endDate) {
  return this.aggregate([
    {
      $match: {
        user: mongoose.Types.ObjectId(userId),
        date: { $gte: new Date(startDate), $lte: new Date(endDate) }
      }
    },
    {
      $lookup: {
        from: 'tasks',
        localField: 'task',
        foreignField: '_id',
        as: 'taskDetails'
      }
    },
    {
      $lookup: {
        from: 'projects',
        localField: 'project',
        foreignField: '_id',
        as: 'projectDetails'
      }
    },
    {
      $group: {
        _id: {
          date: { $dateToString: { format: '%Y-%m-%d', date: '$date' } },
          project: '$project'
        },
        entries: { $push: '$$ROOT' },
        totalHours: { $sum: '$hours' },
        billableHours: {
          $sum: { $cond: ['$billable', '$hours', 0] }
        }
      }
    },
    {
      $sort: { '_id.date': 1 }
    }
  ]);
};

// Static method to get monthly summary
timeEntrySchema.statics.getMonthlySummary = async function(userId, year, month) {
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0);
  
  return this.aggregate([
    {
      $match: {
        user: mongoose.Types.ObjectId(userId),
        date: { $gte: startDate, $lte: endDate }
      }
    },
    {
      $group: {
        _id: '$user',
        totalHours: { $sum: '$hours' },
        billableHours: {
          $sum: { $cond: ['$billable', '$hours', 0] }
        },
        regularHours: {
          $sum: { $cond: [{ $eq: ['$type', 'regular'] }, '$hours', 0] }
        },
        overtimeHours: {
          $sum: { $cond: [{ $eq: ['$type', 'overtime'] }, '$hours', 0] }
        },
        daysWorked: { $addToSet: '$date' },
        projectsWorked: { $addToSet: '$project' }
      }
    },
    {
      $project: {
        totalHours: 1,
        billableHours: 1,
        regularHours: 1,
        overtimeHours: 1,
        daysWorked: { $size: '$daysWorked' },
        projectsCount: { $size: '$projectsWorked' },
        averageHoursPerDay: {
          $divide: ['$totalHours', { $size: '$daysWorked' }]
        }
      }
    }
  ]);
};

// Instance method to approve entry
timeEntrySchema.methods.approve = function(approverId) {
  this.status = 'approved';
  this.approvedBy = approverId;
  this.approvedAt = new Date();
  this.rejectionReason = null;
  return this.save();
};

// Instance method to reject entry
timeEntrySchema.methods.reject = function(approverId, reason) {
  this.status = 'rejected';
  this.approvedBy = approverId;
  this.approvedAt = new Date();
  this.rejectionReason = reason;
  return this.save();
};

module.exports = mongoose.model('TimeEntry', timeEntrySchema);