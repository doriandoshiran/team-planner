const express = require('express');
const Task = require('../models/Task');
const auth = require('../middleware/auth');

const router = express.Router();

// Get all tasks
router.get('/', auth, async (req, res) => {
  try {
    const { project, status } = req.query;
    const query = { 
      $or: [
        { assignee: req.user.userId },
        { createdBy: req.user.userId }
      ]
    };

    if (project) query.project = project;
    if (status) query.status = status;

    const tasks = await Task.find(query)
      .populate('assignee', 'name email department')
      .populate('project', 'name color')
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 });

    res.json(tasks);
  } catch (error) {
    console.error('Error fetching tasks:', error);
    res.status(500).json({ message: 'Server error fetching tasks' });
  }
});

// Get single task
router.get('/:id', auth, async (req, res) => {
  try {
    const task = await Task.findById(req.params.id)
      .populate('assignee', 'name email department')
      .populate('project', 'name color')
      .populate('createdBy', 'name email')
      .populate('comments.author', 'name email');

    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
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
      assignee, 
      project,
      estimatedHours,
      tags 
    } = req.body;

    const task = new Task({
      title,
      description,
      priority: priority || 'medium',
      status: status || 'todo',
      startDate: startDate || new Date(),
      dueDate,
      assignee,
      project: project || null,
      estimatedHours: estimatedHours || 0,
      tags: tags || [],
      createdBy: req.user.userId
    });

    await task.save();
    
    await task.populate('assignee', 'name email department');
    await task.populate('project', 'name color');
    await task.populate('createdBy', 'name email');

    console.log('Task created:', task.title);

    res.status(201).json(task);
  } catch (error) {
    console.error('Error creating task:', error);
    res.status(500).json({ message: 'Server error creating task' });
  }
});

// Update task
router.put('/:id', auth, async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    // Check permissions - assignee or creator can update
    if (task.assignee.toString() !== req.user.userId && 
        task.createdBy.toString() !== req.user.userId) {
      return res.status(403).json({ message: 'Not authorized to update this task' });
    }

    // Update task fields
    Object.assign(task, req.body);
    await task.save();

    await task.populate('assignee', 'name email department');
    await task.populate('project', 'name color');
    await task.populate('createdBy', 'name email');

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

    // Check permissions
    if (task.assignee.toString() !== req.user.userId && 
        task.createdBy.toString() !== req.user.userId) {
      return res.status(403).json({ message: 'Not authorized to update this task' });
    }

    task.status = status;
    await task.save();

    await task.populate('assignee', 'name email department');
    await task.populate('project', 'name color');

    res.json(task);
  } catch (error) {
    console.error('Error updating task status:', error);
    res.status(500).json({ message: 'Server error updating task status' });
  }
});

// Delete task
router.delete('/:id', auth, async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);

    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    // Only creator can delete
    if (task.createdBy.toString() !== req.user.userId) {
      return res.status(403).json({ message: 'Not authorized to delete this task' });
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

    task.comments.push({
      text: req.body.text,
      author: req.user.userId
    });

    await task.save();
    
    // Return the new comment with populated author
    const updatedTask = await Task.findById(req.params.id)
      .populate('comments.author', 'name email');
    
    const newComment = updatedTask.comments[updatedTask.comments.length - 1];

    res.status(201).json(newComment);
  } catch (error) {
    console.error('Error adding comment:', error);
    res.status(500).json({ message: 'Server error adding comment' });
  }
});

module.exports = router;