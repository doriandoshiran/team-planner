const express = require('express');
const router = express.Router();
const {
  register,
  login,
  getMe,
  updateDetails,
  updatePassword,
  updatePreferences,
  logout
} = require('../controllers/authController');
const { protect, rateLimiter } = require('../middleware/auth');

// Public routes
router.post('/register', rateLimiter(5, 15 * 60 * 1000), register);
router.post('/login', rateLimiter(10, 15 * 60 * 1000), login);

// Protected routes
router.use(protect);
router.get('/me', getMe);
router.put('/updatedetails', updateDetails);
router.put('/updatepassword', updatePassword);
router.put('/preferences', updatePreferences);
router.get('/logout', logout);

module.exports = router;