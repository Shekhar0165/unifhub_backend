const express = require('express');
const router = express.Router();
const {
    HandlePandingPost,
    HandleAddAchievementPost,
    HandleUpdatePost,
    HandleDeletePost,
    HandleLikePost,
    HandleCommentPost,
    GetUserPosts,
    GetPostComments,
    GetPostLikes,
    HandleCheckUserLikeOrNot,
    HandlePostCount,
    HandleGetUserPostById
} = require('../../Controllers/application/UserPost');
const auth = require('../../middleware/auth');
const MulterConfig = require('../../config/Multer');
const MulterToS3 = require('../../middleware/multerToS3');

// Initialize Multer
const PostUpdate = new MulterConfig('./public/post').upload();

// Initialize S3 upload handler for events files
const s3Upload = new MulterToS3();

// Get all posts for a user
router.get('/user/:id', auth, GetUserPosts);

// Get pending posts
router.get('/pending', auth, HandlePandingPost);
router.post('/user/one/:postId', auth, HandleGetUserPostById);
router.get('/check-like/:postId', auth, HandleCheckUserLikeOrNot);

// Add a new post
router.post('/add', auth,PostUpdate.single('postImage'), s3Upload.uploadToS3('post'), HandleAddAchievementPost);

// Update an existing post
router.put('/update/:postId',auth, PostUpdate.single('image'), s3Upload.uploadToS3('post') , HandleUpdatePost);

// Delete a post
router.delete('/delete/:postId', auth, HandleDeletePost);

// Like/unlike a post
router.get('/like/:postId', auth, HandleLikePost);

// Get all users who liked a post
router.get('/likes/:postId', auth, GetPostLikes);

// Comment on a post
router.post('/comment/:postId', auth, HandleCommentPost);

// Get all comments for a post
router.get('/comments/:postId', auth, GetPostComments);

router.get('/count/:id', auth, HandlePostCount);

module.exports = router;