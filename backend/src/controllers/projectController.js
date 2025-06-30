const Project = require('../models/Project');
const Task = require('../models/Task');

// @desc    Get all projects
// @route   GET /api/projects
// @access  Private
const getProjects = async (req, res) => {
  try {
    const { status, type, search } = req.query;
    const query = { isArchived: false };

    // Filter by user access
    if (req.user.role !== 'admin') {
      query.$or = [
        { owner: req.user.id },
        { 'team.user': req.user.id },
        { 'settings.visibility': 'public' }
      ];
    }

    if (status) query.status = status;
    if (type) query.type = type;
    if (search) {
      query.name = { $regex: search, $options: 'i' };
    }

    const projects = await Project.find(query)
      .populate('owner', 'name email avatar')
      .populate('team.user', 'name email avatar')
      .sort('-createdAt');

    res.json({
      success: true,
      count: projects.length,
      projects
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get single project
// @route   GET /api/projects/:id
// @access  Private
const getProject = async (req, res) => {
  try {
    const project = await Project.findById(req.params.id)
      .populate('owner', 'name email avatar')
      .populate('team.user', 'name email avatar position');

    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }

    // Check access
    const hasAccess = 
      req.user.role === 'admin' ||
      project.owner._id.toString() === req.user.id ||
      project.team.some(member => member.user._id.toString() === req.user.id) ||
      project.settings.visibility === 'public';

    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    res.json({
      success: true,
      project
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Create project
// @route   POST /api/projects
// @access  Private
const createProject = async (req, res) => {
  try {
    const projectData = {
      ...req.body,
      owner: req.user.id,
      team: [{
        user: req.user.id,
        role: 'owner',
        joinedAt: new Date()
      }]
    };

    const project = await Project.create(projectData);
    
    await project.populate('owner', 'name email avatar');
    await project.populate('team.user', 'name email avatar');

    res.status(201).json({
      success: true,
      project
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Update project
// @route   PUT /api/projects/:id
// @access  Private
const updateProject = async (req, res) => {
  try {
    let project = await Project.findById(req.params.id);

    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }

    // Check permission
    const userRole = project.team.find(
      member => member.user.toString() === req.user.id
    )?.role;

    if (req.user.role !== 'admin' && userRole !== 'owner' && userRole !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this project'
      });
    }

    // Update fields
    const updateFields = [
      'name', 'description', 'status', 'type',
      'startDate', 'endDate', 'budget', 'settings',
      'tags', 'color', 'icon'
    ];

    updateFields.forEach(field => {
      if (req.body[field] !== undefined) {
        project[field] = req.body[field];
      }
    });

    await project.save();
    
    await project.populate('owner', 'name email avatar');
    await project.populate('team.user', 'name email avatar');

    res.json({
      success: true,
      project
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Delete project
// @route   DELETE /api/projects/:id
// @access  Private (Admin/Owner only)
const deleteProject = async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);

    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }

    // Check permission
    if (req.user.role !== 'admin' && project.owner.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this project'
      });
    }

    // Soft delete
    project.isArchived = true;
    project.archivedAt = new Date();
    project.archivedBy = req.user.id;
    await project.save();

    // Archive all associated tasks
    await Task.updateMany(
      { project: project._id },
      { isArchived: true }
    );

    res.json({
      success: true,
      message: 'Project archived successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Add team member
// @route   POST /api/projects/:id/team
// @access  Private
const addTeamMember = async (req, res) => {
  try {
    const { userId, role = 'member' } = req.body;
    const project = await Project.findById(req.params.id);

    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }

    // Check permission
    const userRole = project.team.find(
      member => member.user.toString() === req.user.id
    )?.role;

    if (req.user.role !== 'admin' && userRole !== 'owner' && userRole !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to add team members'
      });
    }

    await project.addTeamMember(userId, role);
    
    await project.populate('team.user', 'name email avatar');

    res.json({
      success: true,
      project
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Remove team member
// @route   DELETE /api/projects/:id/team
// @access  Private
const removeTeamMember = async (req, res) => {
  try {
    const { userId } = req.body;
    const project = await Project.findById(req.params.id);

    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }

    // Check permission
    const userRole = project.team.find(
      member => member.user.toString() === req.user.id
    )?.role;

    if (req.user.role !== 'admin' && userRole !== 'owner' && userRole !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to remove team members'
      });
    }

    // Prevent removing the owner
    if (project.owner.toString() === userId) {
      return res.status(400).json({
        success: false,
        message: 'Cannot remove project owner'
      });
    }

    await project.removeTeamMember(userId);

    res.json({
      success: true,
      message: 'Team member removed successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get project statistics
// @route   GET /api/projects/:id/stats
// @access  Private
const getProjectStats = async (req, res) => {
  try {
    const projectId = req.params.id;
    
    // Get task statistics
    const taskStats = await Task.aggregate([
      { $match: { project: require('mongoose').Types.ObjectId(projectId) } },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    // Get time statistics
    const TimeEntry = require('../models/TimeEntry');
    const timeStats = await TimeEntry.aggregate([
      { $match: { project: require('mongoose').Types.ObjectId(projectId) } },
      {
        $group: {
          _id: null,
          totalHours: { $sum: '$hours' },
          billableHours: {
            $sum: { $cond: ['$billable', '$hours', 0] }
          }
        }
      }
    ]);

    res.json({
      success: true,
      stats: {
        tasks: taskStats,
        time: timeStats[0] || { totalHours: 0, billableHours: 0 }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

module.exports = {
  getProjects,
  getProject,
  createProject,
  updateProject,
  deleteProject,
  addTeamMember,
  removeTeamMember,
  getProjectStats
};