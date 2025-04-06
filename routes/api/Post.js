const express = require('express');
const router = express.Router();
const {
    HandlePandingPost,
    HandleAddAchievementPost
} = require('../../Controllers/application/UserPost');
const auth = require('../../middleware/auth');



router.get('/:id', HandlePandingPost);
router.post('/add/post/:id', HandleAddAchievementPost);



module.exports = router;