const express = require('express');
const router = express.Router();
const {
    HandleContectUser
} = require('../../Controllers/application/Chat');
const auth = require('../../middleware/auth');
const MulterToS3 = require('../../middleware/multerToS3');

// @route   POST api/chat/contact
// router.



module.exports = router;