const express = require('express');
const Project = require('../models/Project');
const Task = require('../models/Task');
const User = require('../models/User');
const auth = require('../middleware/auth');

const router = express.Router();

// Get all projects for user
router.get('/', auth, async (req, res) => {
  try {
    const { status, priority, search, archived } = req.query;
    
    let query = {
      $or: [
        { createdBy: req.user.userId },
        { 'teamMembers.userId': req.user.userId }
      ]
    };

    if (archived !== undefined) {
      query.isArchived = archived === 'true';
    } else {
      query.isArchived = false;
    }

    if (status) query.status = status;
    if (priority) query.priority = priority;
    if (search) {
      query.$and = [
        query,
        {
          $or: [
            { name: { $regex: search, $options: 'i' } },
            { description: { $regex: search, $options: 'i' } }
          ]
        }
      ];
    }

    const projects = await Project.find(query)
      .populate('teamMembers.userId', 'name email')
      .populate('tasks')
      .sort({ updatedAt: -1 });

    res.json(projects);
  } catch (error) {
    console.error('Error fetching projects:', error);
    res.status(500).json({ message: 'Server error fetching projects' });
  }
});

// Get single project
router.get('/:id', auth, async (req, res) => {
  try {
    const project = await Project.findOne({
      _id: req.params.id,
      $or: [
        { createdBy: req.user.userId },
        { 'teamMembers.userId': req.user.userId }
      ]
    })
    .populate('teamMembers.userId', 'name email department')
    .populate('tasks')
    .populate('createdBy', 'name email');

    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    res.json(project);
  } catch (error) {
    console.error('Error fetching project:', error);
    res.status(500).json({ message: 'Server error fetching project' });
  }
});

// Create new project
router.post('/', auth, async (req, res) => {
  try {
    let {
      name,
      description,
      status,
      priority,
      startDate,
      dueDate,
      teamMembers,
      milestones,
      tags,
      client,
      department
    } = req.body;

    if (Array.isArray(teamMembers) && teamMembers.length > 0 && typeof teamMembers[0] === 'string') {
      teamMembers = teamMembers.map(userId => ({ userId }));
    }

    const project = new Project({
      name,
      description,
      status: status || 'planning',
      priority: priority || 'medium',
      startDate,
      dueDate,
      teamMembers: teamMembers || [],
      milestones: milestones || [],
      tags: tags || [],
      client,
      department,
      createdBy: req.user.userId
    });

    await project.save();

    const populatedProject = await Project.findById(project._id)
      .populate('teamMembers.userId', 'name email')
      .populate('createdBy', 'name email');

    console.log('Project created:', project.name);
    res.status(201).json(populatedProject);
  } catch (error) {
    console.error('Error creating project:', error);
    res.status(500).json({ message: 'Server error creating project' });
  }
});

// Update project
router.put('/:id', auth, async (req, res) => {
  try {
    const project = await Project.findOne({
      _id: req.params.id,
      $or: [
        { createdBy: req.user.userId },
        { 'teamMembers.userId': req.user.userId, 'teamMembers.role': { $in: ['lead', 'manager'] } }
      ]
    });

    if (!project) {
      return res.status(404).json({ message: 'Project not found or no permission' });
    }

    let updateData = { ...req.body };
    if (updateData.teamMembers && Array.isArray(updateData.teamMembers)) {
      if (updateData.teamMembers.length > 0 && typeof updateData.teamMembers[0] === 'string') {
        updateData.teamMembers = updateData.teamMembers.map(userId => ({ userId }));
      }
    }

    Object.keys(updateData).forEach(key => {
      if (key !== '_id' && key !== '__v') {
        project[key] = updateData[key];
      }
    });

    const progress = await project.calculateProgress();
    project.progress = progress;

    if (project.progress === 100 && project.status !== 'completed') {
      project.status = 'completed';
      project.completedDate = new Date();
    }

    await project.save();

    const updatedProject = await Project.findById(project._id)
      .populate('teamMembers.userId', 'name email')
      .populate('tasks');

    res.json(updatedProject);
  } catch (error) {
    console.error('Error updating project:', error);
    res.status(500).json({ message: 'Server error updating project' });
  }
});

// Delete project (FIXED - Also delete associated tasks)
router.delete('/:id', auth, async (req, res) => {
  try {
    const project = await Project.findOne({
      _id: req.params.id,
      createdBy: req.user.userId
    });

    if (!project) {
      return res.status(404).json({ message: 'Project not found or no permission' });
    }

    // Delete all tasks associated with this project
    await Task.deleteMany({ project: req.params.id });

    // Delete the project
    await Project.findByIdAndDelete(req.params.id);
    
    res.json({ message: 'Project and associated tasks deleted successfully' });
  } catch (error) {
    console.error('Error deleting project:', error);
    res.status(500).json({ message: 'Server error deleting project' });
  }
});

// Add team member
router.post('/:id/team', auth, async (req, res) => {
  try {
    const { userId, role } = req.body;
    
    const project = await Project.findOne({
      _id: req.params.id,
      createdBy: req.user.userId
    });

    if (!project) {
      return res.status(404).json({ message: 'Project not found or no permission' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const existingMember = project.teamMembers.find(
      member => member.userId.toString() === userId
    );

    if (existingMember) {
      return res.status(400).json({ message: 'User is already a team member' });
    }

    project.teamMembers.push({
      userId,
      name: user.name,
      role: role || 'member'
    });

    await project.save();
    
    const updatedProject = await Project.findById(project._id)
      .populate('teamMembers.userId', 'name email');

    res.json(updatedProject);
  } catch (error) {
    console.error('Error adding team member:', error);
    res.status(500).json({ message: 'Server error adding team member' });
  }
});

// Remove team member
router.delete('/:id/team/:userId', auth, async (req, res) => {
  try {
    const project = await Project.findOne({
      _id: req.params.id,
      createdBy: req.user.userId
    });

    if (!project) {
      return res.status(404).json({ message: 'Project not found or no permission' });
    }

    project.teamMembers = project.teamMembers.filter(
      member => member.userId.toString() !== req.params.userId
    );

    await project.save();
    res.json({ message: 'Team member removed successfully' });
  } catch (error) {
    console.error('Error removing team member:', error);
    res.status(500).json({ message: 'Server error removing team member' });
  }
});

// Add comment
router.post('/:id/comments', auth, async (req, res) => {
  try {
    const { text } = req.body;
    
    const project = await Project.findOne({
      _id: req.params.id,
      $or: [
        { createdBy: req.user.userId },
        { 'teamMembers.userId': req.user.userId }
      ]
    });

    if (!project) {
      return res.status(404).json({ message: 'Project not found or no permission' });
    }

    const user = await User.findById(req.user.userId);
    
    project.comments.push({
      text,
      author: req.user.userId,
      authorName: user.name
    });

    await project.save();
    res.json(project.comments[project.comments.length - 1]);
  } catch (error) {
    console.error('Error adding comment:', error);
    res.status(500).json({ message: 'Server error adding comment' });
  }
});

// Update progress
router.patch('/:id/progress', auth, async (req, res) => {
  try {
    const project = await Project.findOne({
      _id: req.params.id,
      $or: [
        { createdBy: req.user.userId },
        { 'teamMembers.userId': req.user.userId }
      ]
    });

    if (!project) {
      return res.status(404).json({ message: 'Project not found or no permission' });
    }

    const progress = await project.calculateProgress();
    project.progress = progress;
    
    if (project.progress === 100 && project.status !== 'completed') {
      project.status = 'completed';
      project.completedDate = new Date();
    }

    await project.save();
    res.json(project);
  } catch (error) {
    console.error('Error updating progress:', error);
    res.status(500).json({ message: 'Server error updating progress' });
  }
});

// Archive/Unarchive project
router.patch('/:id/archive', auth, async (req, res) => {
  try {
    const { archived } = req.body;
    
    const project = await Project.findOne({
      _id: req.params.id,
      createdBy: req.user.userId
    });

    if (!project) {
      return res.status(404).json({ message: 'Project not found or no permission' });
    }

    project.isArchived = archived;
    await project.save();
    
    res.json({ message: archived ? 'Project archived' : 'Project unarchived' });
  } catch (error) {
    console.error('Error archiving project:', error);
    res.status(500).json({ message: 'Server error archiving project' });
  }
});

module.exports = router;
