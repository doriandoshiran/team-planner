const mongoose = require('mongoose');

const projectSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Project name is required'],
    trim: true,
    maxlength: [200, 'Name cannot exceed 200 characters']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [2000, 'Description cannot exceed 2000 characters']
  },
  status: {
    type: String,
    enum: ['planning', 'active', 'completed', 'onHold', 'cancelled'],
    default: 'planning'
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  startDate: {
    type: Date
  },
  dueDate: {
    type: Date
  },
  completedDate: {
    type: Date
  },
  progress: {
    type: Number,
    min: 0,
    max: 100,
    default: 0
  },
  teamMembers: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    name: String,
    role: {
      type: String,
      enum: ['lead', 'developer', 'designer', 'tester', 'analyst', 'member'],
      default: 'member'
    },
    assignedDate: {
      type: Date,
      default: Date.now
    }
  }],
  tasks: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Task'
  }],
  milestones: [{
    name: String,
    description: String,
    dueDate: Date,
    completed: { type: Boolean, default: false },
    completedDate: Date
  }],
  tags: [String],
  client: {
    name: String,
    email: String,
    company: String
  },
  attachments: [{
    name: String,
    url: String,
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }],
  comments: [{
    text: String,
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    authorName: String,
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  department: String,
  isArchived: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Indexes for better performance
projectSchema.index({ status: 1, createdBy: 1 });
projectSchema.index({ dueDate: 1 });
projectSchema.index({ 'teamMembers.userId': 1 });
projectSchema.index({ tags: 1 });

// Virtual for overdue status
projectSchema.virtual('isOverdue').get(function() {
  return this.dueDate && this.dueDate < new Date() && this.status !== 'completed';
});

// Calculate completion percentage based on tasks
projectSchema.methods.calculateProgress = async function() {
  if (this.tasks.length === 0) return 0;
  
  const Task = mongoose.model('Task');
  const tasks = await Task.find({ _id: { $in: this.tasks } });
  const completedTasks = tasks.filter(task => task.status === 'done');
  
  return Math.round((completedTasks.length / tasks.length) * 100);
};

module.exports = mongoose.model('Project', projectSchema);
