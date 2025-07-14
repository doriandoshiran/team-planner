const express = require('express');
const auth = require('../middleware/auth');
const Task = require('../models/Task');
const User = require('../models/User');
const Project = require('../models/Project');

const router = express.Router();

// Get all tasks
router.get('/', auth, async (req, res) => {
  try {
    const { status, priority, userId, projectId } = req.query;
    
    // Build filter object
    const filter = {};
    if (status) filter.status = status;
    if (priority) filter.priority = priority;
    if (userId) filter.userId = userId;
    if (projectId) filter.project = projectId;

    const tasks = await Task.find(filter)
      .populate('userId', 'name email department')
      .populate('project', 'name description')
      .sort({ createdAt: -1 });

    console.log(`Found ${tasks.length} tasks`);
    res.json(tasks);
  } catch (error) {
    console.error('Error fetching tasks:', error);
    res.status(500).json({ message: 'Server error fetching tasks' });
  }
});

// Get tasks by user
router.get('/user/:userId', auth, async (req, res) => {
  try {
    const { userId } = req.params;
    const tasks = await Task.find({ userId })
      .populate('userId', 'name email department')
      .populate('project', 'name description')
      .sort({ createdAt: -1 });

    res.json(tasks);
  } catch (error) {
    console.error('Error fetching user tasks:', error);
    res.status(500).json({ message: 'Server error fetching user tasks' });
  }
});

// Get tasks by project
router.get('/project/:projectId', auth, async (req, res) => {
  try {
    const { projectId } = req.params;
    const tasks = await Task.find({ project: projectId })
      .populate('userId', 'name email department')
      .populate('project', 'name description')
      .sort({ createdAt: -1 });

    res.json(tasks);
  } catch (error) {
    console.error('Error fetching project tasks:', error);
    res.status(500).json({ message: 'Server error fetching project tasks' });
  }
});

// Create new task
router.post('/', auth, async (req, res) => {
  try {
    const { title, description, priority, status, startDate, dueDate, userId, project, tags } = req.body;

    console.log('Creating task:', req.body);

    // Validation
    if (!title || !title.trim()) {
      return res.status(400).json({ message: 'Title is required' });
    }

    if (!userId) {
      return res.status(400).json({ message: 'Assignee is required' });
    }

    // Verify assignee exists
    const assignee = await User.findById(userId);
    if (!assignee) {
      return res.status(400).json({ message: 'Assignee not found' });
    }

    // Verify project exists if provided
    if (project) {
      const projectDoc = await Project.findById(project);
      if (!projectDoc) {
        return res.status(400).json({ message: 'Project not found' });
      }
    }

    const task = new Task({
      title: title.trim(),
      description: description?.trim() || '',
      priority: priority || 'medium',
      status: status || 'todo',
      startDate: startDate ? new Date(startDate) : new Date(),
      dueDate: dueDate ? new Date(dueDate) : null,
      userId,
      project: project || null,
      tags: tags || [],
      createdBy: req.user.userId
    });

    await task.save();
    
    // Populate the response
    await task.populate('userId', 'name email department');
    await task.populate('project', 'name description');

    console.log('Task created successfully:', task._id);
    res.status(201).json(task);
  } catch (error) {
    console.error('Error creating task:', error);
    res.status(500).json({ message: 'Server error creating task' });
  }
});

// Update task
router.put('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, priority, status, startDate, dueDate, userId, project, tags } = req.body;

    console.log('Updating task:', id, req.body);

    const task = await Task.findById(id);
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    // Validation
    if (title !== undefined && (!title || !title.trim())) {
      return res.status(400).json({ message: 'Title cannot be empty' });
    }

    // Verify assignee exists if provided
    if (userId) {
      const assignee = await User.findById(userId);
      if (!assignee) {
        return res.status(400).json({ message: 'Assignee not found' });
      }
    }

    // Verify project exists if provided
    if (project) {
      const projectDoc = await Project.findById(project);
      if (!projectDoc) {
        return res.status(400).json({ message: 'Project not found' });
      }
    }

    // Update fields
    if (title !== undefined) task.title = title.trim();
    if (description !== undefined) task.description = description?.trim() || '';
    if (priority !== undefined) task.priority = priority;
    if (status !== undefined) task.status = status;
    if (startDate !== undefined) task.startDate = startDate ? new Date(startDate) : new Date();
    if (dueDate !== undefined) task.dueDate = dueDate ? new Date(dueDate) : null;
    if (userId !== undefined) task.userId = userId;
    if (project !== undefined) task.project = project || null;
    if (tags !== undefined) task.tags = tags || [];
    
    task.updatedBy = req.user.userId;
    task.updatedAt = new Date();

    await task.save();
    
    // Populate the response
    await task.populate('userId', 'name email department');
    await task.populate('project', 'name description');

    console.log('Task updated successfully:', task._id);
    res.json(task);
  } catch (error) {
    console.error('Error updating task:', error);
    res.status(500).json({ message: 'Server error updating task' });
  }
});

// Update task status
router.patch('/:id/status', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    console.log('Updating task status:', id, status);

    if (!status || !['todo', 'inprogress', 'done'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    const task = await Task.findById(id);
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    task.status = status;
    task.updatedBy = req.user.userId;
    task.updatedAt = new Date();

    // Set completion date if marking as done
    if (status === 'done' && task.status !== 'done') {
      task.completedAt = new Date();
    } else if (status !== 'done') {
      task.completedAt = null;
    }

    await task.save();
    
    // Populate the response
    await task.populate('userId', 'name email department');
    await task.populate('project', 'name description');

    console.log('Task status updated successfully:', task._id);
    res.json(task);
  } catch (error) {
    console.error('Error updating task status:', error);
    res.status(500).json({ message: 'Server error updating task status' });
  }
});

// Assign task to user
router.patch('/:id/assign', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const { userId } = req.body;

    console.log('Assigning task:', id, 'to user:', userId);

    if (!userId) {
      return res.status(400).json({ message: 'User ID is required' });
    }

    // Verify assignee exists
    const assignee = await User.findById(userId);
    if (!assignee) {
      return res.status(400).json({ message: 'Assignee not found' });
    }

    const task = await Task.findById(id);
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    task.userId = userId;
    task.updatedBy = req.user.userId;
    task.updatedAt = new Date();

    await task.save();
    
    // Populate the response
    await task.populate('userId', 'name email department');
    await task.populate('project', 'name description');

    console.log('Task assigned successfully:', task._id);
    res.json(task);
  } catch (error) {
    console.error('Error assigning task:', error);
    res.status(500).json({ message: 'Server error assigning task' });
  }
});

// Delete task
router.delete('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;

    console.log('Deleting task:', id);

    const task = await Task.findById(id);
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    await Task.findByIdAndDelete(id);

    console.log('Task deleted successfully:', id);
    res.json({ message: 'Task deleted successfully' });
  } catch (error) {
    console.error('Error deleting task:', error);
    res.status(500).json({ message: 'Server error deleting task' });
  }
});

module.exports = router;
