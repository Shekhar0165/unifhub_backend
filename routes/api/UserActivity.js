const express = require('express');
const router = express.Router();
const userActivityController = require('../../Controllers/application/UserActivity');
const auth = require('../../middleware/auth');

// Route to get a user's activity data
router.get('/:userId', userActivityController.getUserActivity);

// Route to get top users by activity score
router.get('/leaderboard/top', userActivityController.getTopUsers);

// GitHub related routes
router.post('/:userId/github', auth, userActivityController.connectGitHub);
router.get('/:userId/github', auth, userActivityController.getGitHubActivity);

// Admin route to recalculate all users' activity data
router.post('/recalculate/all', auth, userActivityController.recalculateAllUserActivity);

module.exports = router;
