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


const UserUpdate = new MulterConfig('./public/User').upload();
const ImageRender = new ImageRenderer('../public/User');


// Protected routes - require authentication
router.get('/one', auth, HandleGetUser);
router.get('/profile/:userid', auth, HandleGetForProfile);
router.get('/members/search', auth, HandleSearchUser);
router.put('/:id', auth, UserUpdate.fields([
    { name: 'profileImage', maxCount: 1 },
    { name: 'coverImage', maxCount: 1 }
]), HanldeUpdateUser);
router.delete('/:id', auth, HandleDeleteUser);
router.put('/password/:id', auth, HandleUpdatePassword);


router.get('/:filename', (req, res) => ImageRender.renderImage(req, res));

module.exports = router;