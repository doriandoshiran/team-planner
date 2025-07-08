const express = require('express');
const Task = require('../models/Task');
const Project = require('../models/Project');
const User = require('../models/User');
const auth = require('../middleware/auth');

const router = express.Router();

// Get all tasks (FIXED - Removed problematic populates)
router.get('/', auth, async (req, res) => {
  try {
    const { project, assignee, status } = req.query;
    const currentUser = await User.findById(req.user.userId);
    let query = {};

    if (project) {
      query.project = project;
    } else if (assignee && currentUser.role === 'admin') {
      query.userId = assignee;
    } else {
      if (currentUser.role === 'admin') {
        query = {};
      } else {
        query.userId = req.user.userId;
      }
    }

    if (status) query.status = status;

    const tasks = await Task.find(query)
      .populate('userId', 'name email department')
      .sort({ createdAt: -1 });

    res.json(tasks);
  } catch (error) {
    console.error('Error fetching tasks:', error);
    res.status(500).json({ message: 'Server error fetching tasks' });
  }
});

// Get single task (FIXED - Removed problematic populates)
router.get('/:id', auth, async (req, res) => {
  try {
    const task = await Task.findById(req.params.id)
      .populate('userId', 'name email department');

    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    const currentUser = await User.findById(req.user.userId);
    if (currentUser.role !== 'admin' && task.userId._id.toString() !== req.user.userId) {
      return res.status(403).json({ message: 'Not authorized to view this task' });
    }

    res.json(task);
  } catch (error) {
    console.error('Error fetching task:', error);
    res.status(500).json({ message: 'Server error fetching task' });
  }
});

// Create new task
router.post('/', auth, async (req, res) => {
  try {
    const { 
      title, 
      description, 
      priority, 
      status, 
      startDate,
      dueDate, 
      userId,
      assignee,
      project,
      tags 
    } = req.body;

    if (!title) {
      return res.status(400).json({ message: 'Title is required' });
    }
    
    if (!userId && !assignee) {
      return res.status(400).json({ message: 'Assignee (userId) is required' });
    }

    const taskData = {
      title,
      description,
      priority: priority || 'medium',
      status: status || 'todo',
      startDate: startDate || new Date(),
      dueDate,
      userId: userId || assignee,
      tags: tags || []
    };

    if (project && project.trim() !== '') {
      taskData.project = project;
    }

    const task = new Task(taskData);
    await task.save();
    
    // If task is assigned to a project, add it to the project's tasks array
    if (project && project.trim() !== '') {
      try {
        await Project.findByIdAndUpdate(
          project,
          { $addToSet: { tasks: task._id } }
        );
        
        // Update project progress after adding task
        const updatedProject = await Project.findById(project);
        if (updatedProject) {
          const progress = await updatedProject.calculateProgress();
          updatedProject.progress = progress;
          await updatedProject.save();
        }
      } catch (err) {
        console.log('Could not add task to project:', err.message);
      }
    }
    
    await task.populate('userId', 'name email department');

    res.status(201).json(task);
  } catch (error) {
    console.error('Error creating task:', error);
    res.status(500).json({ message: 'Server error creating task', error: error.message });
  }
});

// Update task
router.put('/:id', auth, async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    const currentUser = await User.findById(req.user.userId);
    if (currentUser.role !== 'admin' && task.userId.toString() !== req.user.userId) {
      return res.status(403).json({ message: 'Not authorized to update this task' });
    }

    const oldStatus = task.status;
    Object.assign(task, req.body);
    await task.save();

    // Update project progress if task status changed
    if (task.project && oldStatus !== task.status) {
      try {
        const project = await Project.findById(task.project);
        if (project) {
          const progress = await project.calculateProgress();
          project.progress = progress;
          
          if (progress === 100 && project.status !== 'completed') {
            project.status = 'completed';
            project.completedDate = new Date();
          }
          
          await project.save();
        }
      } catch (err) {
        console.log('Could not update project progress:', err.message);
      }
    }

    await task.populate('userId', 'name email department');
    res.json(task);
  } catch (error) {
    console.error('Error updating task:', error);
    res.status(500).json({ message: 'Server error updating task' });
  }
});

// Update task status
router.patch('/:id/status', auth, async (req, res) => {
  try {
    const { status } = req.body;
    
    const task = await Task.findById(req.params.id);
    
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    const currentUser = await User.findById(req.user.userId);
    if (currentUser.role !== 'admin' && task.userId.toString() !== req.user.userId) {
      return res.status(403).json({ message: 'Not authorized to update this task' });
    }

    const oldStatus = task.status;
    task.status = status;
    await task.save();

    // Update project progress if task status changed
    if (task.project && oldStatus !== status) {
      try {
        const project = await Project.findById(task.project);
        if (project) {
          const progress = await project.calculateProgress();
          project.progress = progress;
          
          if (progress === 100 && project.status !== 'completed') {
            project.status = 'completed';
            project.completedDate = new Date();
          }
          
          await project.save();
        }
      } catch (err) {
        console.log('Could not update project progress:', err.message);
      }
    }

    await task.populate('userId', 'name email department');
    res.json(task);
  } catch (error) {
    console.error('Error updating task status:', error);
    res.status(500).json({ message: 'Server error updating task status' });
  }
});

// Delete task (FIXED - Proper permission check)
router.delete('/:id', auth, async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);

    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    const currentUser = await User.findById(req.user.userId);
    
    // Allow deletion if user is admin OR if task is assigned to them
    if (currentUser.role !== 'admin' && task.userId && task.userId.toString() !== req.user.userId) {
      return res.status(403).json({ message: 'Not authorized to delete this task' });
    }

    const projectId = task.project;

    // Remove task from project if it exists
    if (projectId) {
      try {
        await Project.findByIdAndUpdate(
          projectId,
          { $pull: { tasks: task._id } }
        );
        
        // Update project progress after removing task
        const project = await Project.findById(projectId);
        if (project) {
          const progress = await project.calculateProgress();
          project.progress = progress;
          await project.save();
        }
      } catch (err) {
        console.log('Could not remove task from project:', err.message);
      }
    }

    await task.deleteOne();
    res.json({ message: 'Task deleted successfully' });
  } catch (error) {
    console.error('Error deleting task:', error);
    res.status(500).json({ message: 'Server error deleting task' });
  }
});

// Add comment to task
router.post('/:id/comments', auth, async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    if (task.comments) {
      task.comments.push({
        text: req.body.text,
        author: req.user.userId
      });
      await task.save();
    }

    res.status(201).json({ message: 'Comment added successfully' });
  } catch (error) {
    console.error('Error adding comment:', error);
    res.status(500).json({ message: 'Server error adding comment' });
  }
});

module.exports = router;
