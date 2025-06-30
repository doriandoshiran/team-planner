const Task = require('../models/Task');
const Project = require('../models/Project');

// @desc    Get all tasks
// @route   GET /api/tasks
// @access  Private
const getTasks = async (req, res) => {
  try {
    const {
      project,
      assignee,
      status,
      priority,
      search,
      startDate,
      endDate,
      page = 1,
      limit = 20,
      sort = '-createdAt'
    } = req.query;

    // Build query
    const query = { isArchived: false };

    if (project) query.project = project;
    if (assignee) query.assignee = assignee;
    if (status) query.status = status;
    if (priority) query.priority = priority;

    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    if (startDate || endDate) {
      query.dueDate = {};
      if (startDate) query.dueDate.$gte = new Date(startDate);
      if (endDate) query.dueDate.$lte = new Date(endDate);
    }

    // Check user permissions
    if (req.user.role === 'member') {
      // Members can only see tasks assigned to them or in public projects
      const userProjects = await Project.find({
        $or: [
          { 'team.user': req.user.id },
          { 'settings.visibility': 'public' }
        ]
      }).select('_id');
      
      query.$or = [
        { assignee: req.user.id },
        { project: { $in: userProjects.map(p => p._id) } }
      ];
    }

    // Execute query with pagination
    const tasks = await Task.find(query)
      .populate('assignee', 'name email avatar')
      .populate('project', 'name key color')
      .populate('createdBy', 'name email')
      .sort(sort)
      .limit(limit * 1)
      .skip((page - 1) * limit);

    // Get total count
    const count = await Task.countDocuments(query);

    res.status(200).json({
      success: true,
      count,
      pagination: {
        page: parseInt(page),
        pages: Math.ceil(count / limit),
        limit: parseInt(limit)
      },
      tasks
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Error fetching tasks'
    });
  }
};

// @desc    Get single task
// @route   GET /api/tasks/:id
// @access  Private
const getTask = async (req, res) => {
  try {
    const task = await Task.findById(req.params.id)
      .populate('assignee', 'name email avatar')
      .populate('project', 'name key color')
      .populate('createdBy', 'name email')
      .populate('comments.author', 'name email avatar')
      .populate('dependencies', 'title status');

    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found'
      });
    }

    res.status(200).json({
      success: true,
      task
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Error fetching task'
    });
  }
};

// @desc    Create task
// @route   POST /api/tasks
// @access  Private
const createTask = async (req, res) => {
  try {
    const {
      title,
      description,
      project,
      assignee,
      status,
      priority,
      dueDate,
      startDate,
      estimatedHours,
      tags,
      dependencies
    } = req.body;

    // Check if project exists and user has access
    const projectDoc = await Project.findById(project);
    if (!projectDoc) {
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }

    // Check if user is part of the project team or admin
    const isTeamMember = projectDoc.team.some(
      member => member.user.toString() === req.user.id
    );

    if (!isTeamMember && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'You do not have access to create tasks in this project'
      });
    }

    // Create task
    const task = await Task.create({
      title,
      description,
      project,
      assignee,
      createdBy: req.user.id,
      status: status || 'todo',
      priority: priority || 'medium',
      dueDate,
      startDate,
      estimatedHours,
      tags,
      dependencies
    });

    // Populate the created task
    await task.populate('assignee', 'name email avatar');
    await task.populate('project', 'name key color');
    await task.populate('createdBy', 'name email');

    res.status(201).json({
      success: true,
      task
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Error creating task'
    });
  }
};

// @desc    Update task
// @route   PUT /api/tasks/:id
// @access  Private
const updateTask = async (req, res) => {
  try {
    let task = await Task.findById(req.params.id);

    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found'
      });
    }

    // Check permissions
    const project = await Project.findById(task.project);
    const isTeamMember = project.team.some(
      member => member.user.toString() === req.user.id
    );
    const isAssignee = task.assignee && task.assignee.toString() === req.user.id;

    if (!isTeamMember && !isAssignee && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to update this task'
      });
    }

    // Update task
    const allowedUpdates = [
      'title', 'description', 'assignee', 'status',
      'priority', 'dueDate', 'startDate', 'estimatedHours',
      'actualHours', 'tags', 'dependencies'
    ];

    allowedUpdates.forEach(field => {
      if (req.body[field] !== undefined) {
        task[field] = req.body[field];
      }
    });

    await task.save();

    // Populate updated task
    await task.populate('assignee', 'name email avatar');
    await task.populate('project', 'name key color');
    await task.populate('createdBy', 'name email');

    res.status(200).json({
      success: true,
      task
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Error updating task'
    });
  }
};

// @desc    Delete task
// @route   DELETE /api/tasks/:id
// @access  Private
const deleteTask = async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);

    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found'
      });
    }

    // Check permissions (only project admins or system admins can delete)
    const project = await Project.findById(task.project);
    const userRole = project.team.find(
      member => member.user.toString() === req.user.id
    )?.role;

    if (userRole !== 'owner' && userRole !== 'admin' && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to delete this task'
      });
    }

    // Soft delete
    task.isArchived = true;
    await task.save();

    res.status(200).json({
      success: true,
      message: 'Task archived successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Error deleting task'
    });
  }
};

// @desc    Add comment to task
// @route   POST /api/tasks/:id/comments
// @access  Private
const addComment = async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);

    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found'
      });
    }

    const comment = {
      text: req.body.text,
      author: req.user.id,
      createdAt: new Date()
    };

    task.comments.push(comment);
    await task.save();

    // Populate the new comment
    await task.populate('comments.author', 'name email avatar');

    res.status(201).json({
      success: true,
      comment: task.comments[task.comments.length - 1]
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Error adding comment'
    });
  }
};

// @desc    Update subtask
// @route   PUT /api/tasks/:id/subtasks/:subtaskId
// @access  Private
const updateSubtask = async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);

    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found'
      });
    }

    const subtask = task.subtasks.id(req.params.subtaskId);
    if (!subtask) {
      return res.status(404).json({
        success: false,
        message: 'Subtask not found'
      });
    }

    if (req.body.title) subtask.title = req.body.title;
    if (req.body.completed !== undefined) {
      subtask.completed = req.body.completed;
      subtask.completedAt = req.body.completed ? new Date() : null;
    }

    await task.save();

    res.status(200).json({
      success: true,
      subtask
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Error updating subtask'
    });
  }
};

module.exports = {
  getTasks,
  getTask,
  createTask,
  updateTask,
  deleteTask,
  addComment,
  updateSubtask
};