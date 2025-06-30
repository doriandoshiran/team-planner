const mongoose = require('mongoose');

const projectSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Project name is required'],
    trim: true
  },
  key: {
    type: String,
    required: [true, 'Project key is required'],
    unique: true,
    uppercase: true,
    trim: true,
    match: [/^[A-Z0-9]+$/, 'Project key must contain only uppercase letters and numbers']
  },
  description: {
    type: String,
    default: ''
  },
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  team: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    role: {
      type: String,
      enum: ['owner', 'admin', 'member', 'viewer'],
      default: 'member'
    },
    joinedAt: {
      type: Date,
      default: Date.now
    }
  }],
  status: {
    type: String,
    enum: ['planning', 'active', 'on_hold', 'completed', 'cancelled'],
    default: 'planning'
  },
  type: {
    type: String,
    enum: ['software', 'marketing', 'design', 'research', 'other'],
    default: 'other'
  },
  startDate: {
    type: Date,
    default: null
  },
  endDate: {
    type: Date,
    default: null
  },
  budget: {
    amount: {
      type: Number,
      default: 0
    },
    currency: {
      type: String,
      default: 'USD'
    }
  },
  settings: {
    visibility: {
      type: String,
      enum: ['public', 'private', 'team'],
      default: 'team'
    },
    features: {
      timeTracking: {
        type: Boolean,
        default: true
      },
      budgetTracking: {
        type: Boolean,
        default: false
      },
      sprintPlanning: {
        type: Boolean,
        default: false
      }
    }
  },
  customFields: [{
    name: String,
    type: {
      type: String,
      enum: ['text', 'number', 'date', 'select', 'checkbox']
    },
    value: mongoose.Schema.Types.Mixed,
    options: [String] // For select type
  }],
  tags: [{
    type: String,
    trim: true
  }],
  color: {
    type: String,
    default: '#3B82F6' // Default blue color
  },
  icon: {
    type: String,
    default: 'folder'
  },
  isArchived: {
    type: Boolean,
    default: false
  },
  archivedAt: Date,
  archivedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Indexes
projectSchema.index({ key: 1 });
projectSchema.index({ owner: 1, status: 1 });
projectSchema.index({ 'team.user': 1 });

// Virtual for task count
projectSchema.virtual('taskCount', {
  ref: 'Task',
  localField: '_id',
  foreignField: 'project',
  count: true
});

// Virtual for active task count
projectSchema.virtual('activeTasks', {
  ref: 'Task',
  localField: '_id',
  foreignField: 'project',
  match: { status: { $in: ['todo', 'in_progress', 'review'] } },
  count: true
});

// Methods
projectSchema.methods.addTeamMember = function(userId, role = 'member') {
  const existingMember = this.team.find(member => 
    member.user.toString() === userId.toString()
  );
  
  if (!existingMember) {
    this.team.push({ user: userId, role });
  } else {
    existingMember.role = role;
  }
  
  return this.save();
};

projectSchema.methods.removeTeamMember = function(userId) {
  this.team = this.team.filter(member => 
    member.user.toString() !== userId.toString()
  );
  return this.save();
};

// Include virtuals in JSON
projectSchema.set('toJSON', { virtuals: true });

module.exports = mongoose.model('Project', projectSchema);