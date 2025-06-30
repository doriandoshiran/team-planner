const express = require('express');
const router = express.Router();
const {
  getProjects,
  getProject,
  createProject,
  updateProject,
  deleteProject,
  addTeamMember,
  removeTeamMember,
  getProjectStats
} = require('../controllers/projectController');
const { protect, authorize } = require('../middleware/auth');

// All routes require authentication
router.use(protect);

// Routes
router.route('/')
  .get(getProjects)
  .post(createProject);

router.route('/:id')
  .get(getProject)
  .put(updateProject)
  .delete(authorize('admin', 'manager'), deleteProject);

router.route('/:id/team')
  .post(addTeamMember)
  .delete(removeTeamMember);

router.get('/:id/stats', getProjectStats);

module.exports = router;