const express = require('express');
const router = express.Router();
const {
  getTasks,
  getTask,
  createTask,
  updateTask,
  deleteTask,
  addComment,
  updateSubtask
} = require('../controllers/taskController');
const { protect } = require('../middleware/auth');

// All routes require authentication
router.use(protect);

// Task routes
router.route('/')
  .get(getTasks)
  .post(createTask);

router.route('/:id')
  .get(getTask)
  .put(updateTask)
  .delete(deleteTask);

// Task sub-routes
router.post('/:id/comments', addComment);
router.put('/:id/subtasks/:subtaskId', updateSubtask);

module.exports = router;