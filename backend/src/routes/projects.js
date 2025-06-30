const express = require('express');
const router = express.Router();
const Project = require('../models/Project');
const Task = require('../models/Task');
const auth = require('../middleware/auth');

// Get all projects
router.get('/', auth, async (req, res) => {
  try {
    const projects = await Project.find({ 
      $or: [
        { createdBy: req.user.userId },
        { teamMembers: req.user.userId }
      ]
    })
    .populate('teamMembers', 'name email department')
    .populate('createdBy', 'name email')
    .sort({ createdAt: -1 });

    res.json(projects);
  } catch (error) {
    console.error('Error fetching projects:', error);
    res.status(500).json({ message: 'Server error fetching projects' });
  }
});

// Create new project
router.post('/', auth, async (req, res) => {
  try {
    const { name, description, status, startDate, endDate, teamMembers, color, budget, tasks } = req.body;

    const project = new Project({
      name,
      description,
      status,
      startDate,
      endDate,
      teamMembers,
      color,
      budget,
      createdBy: req.user.userId
    });

    await project.save();

    // Create tasks if provided
    if (tasks && tasks.length > 0) {
      const taskPromises = tasks.map(taskData => {
        const task = new Task({
          title: taskData.title,
          assignee: taskData.assignee,
          priority: taskData.priority,
          project: project._id,
          createdBy: req.user.userId,
          startDate: project.startDate
        });
        return task.save();
      });
      
      await Promise.all(taskPromises);
    }

    // Populate before sending response
    await project.populate('teamMembers', 'name email department');
    await project.populate('createdBy', 'name email');

    res.status(201).json(project);
  } catch (error) {
    console.error('Error creating project:', error);
    res.status(500).json({ message: 'Server error creating project' });
  }
});

// Update project
router.put('/:id', auth, async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    // Check if user has permission to update
    if (project.createdBy.toString() !== req.user.userId && 
        !project.teamMembers.includes(req.user.userId)) {
      return res.status(403).json({ message: 'Not authorized to update this project' });
    }

    // Update project fields
    Object.assign(project, req.body);
    await project.save();

    await project.populate('teamMembers', 'name email department');
    await project.populate('createdBy', 'name email');

    res.json(project);
  } catch (error) {
    console.error('Error updating project:', error);
    res.status(500).json({ message: 'Server error updating project' });
  }
});

// Delete project
router.delete('/:id', auth, async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    // Only creator can delete
    if (project.createdBy.toString() !== req.user.userId) {
      return res.status(403).json({ message: 'Not authorized to delete this project' });
    }

    // Delete associated tasks
    await Task.deleteMany({ project: project._id });

    // Delete project
    await project.deleteOne();

    res.json({ message: 'Project deleted successfully' });
  } catch (error) {
    console.error('Error deleting project:', error);
    res.status(500).json({ message: 'Server error deleting project' });
  }
});

// Get project tasks
router.get('/:id/tasks', auth, async (req, res) => {
  try {
    const tasks = await Task.find({ project: req.params.id })
      .populate('assignee', 'name email')
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 });

    res.json(tasks);
  } catch (error) {
    console.error('Error fetching project tasks:', error);
    res.status(500).json({ message: 'Server error fetching project tasks' });
  }
});

module.exports = router;