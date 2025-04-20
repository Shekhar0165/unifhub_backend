const express = require('express');
const router = express.Router();
const {
    HandleGetUser,
    HanldeUpdateUser,
    HandleDeleteUser,
    HandleUpdatePassword,
    HandleSearchUser,
    HandleGetForProfile
} = require('../../Controllers/application/User');
const auth = require('../../middleware/auth');
const MulterConfig = require('../../config/Multer');
const ImageRenderer = require('../../config/ImageRender');
const MulterToS3 = require('../../middleware/multerToS3');

// Initialize Multer
const UserUpdate = new MulterConfig('./public/User').upload();
const ImageRender = new ImageRenderer('../public/User');

// Initialize S3 upload handler for user files
const s3Upload = new MulterToS3();

// Protected routes - require authentication
router.get('/one', auth, HandleGetUser);
router.get('/profile/:userid', auth, HandleGetForProfile);
router.get('/members/search', auth, HandleSearchUser);

// Update user info with file upload to S3
router.put('/:id', auth, 
    UserUpdate.fields([
        { name: 'profileImage', maxCount: 1 },
        { name: 'coverImage', maxCount: 1 }
    ]), 
    s3Upload.uploadToS3('users'),
    HanldeUpdateUser
);

router.delete('/:id', auth, HandleDeleteUser);
router.put('/password/:id', auth, HandleUpdatePassword);


// Keep the image renderer for backward compatibility
router.get('/:filename', (req, res) => ImageRender.renderImage(req, res));

module.exports = router;