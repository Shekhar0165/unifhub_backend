const express = require('express');
const router = express.Router();
const {
    GetEnhancedUserFeed,
    RecordImpression,
    GetMoreFeedItems
} = require('../../Controllers/application/Feed');
const auth = require('../../middleware/auth');

// Get user feed
router.get('/', auth, GetEnhancedUserFeed);

// Load more feed items
router.post('/more', auth, GetMoreFeedItems);

// Record post impression
router.post('/impression/:postId', auth, RecordImpression);

module.exports = router; 