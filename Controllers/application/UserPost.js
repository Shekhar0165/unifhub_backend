const User = require('../../models/User')
// const Post = require('../../models/Post')
// const Comment = require('../../models/Comment')
// const Like = require('../../models/Like')
const Post = require('../../models/Post')
const UserResume = require('../../models/UserResume')


const HandlePandingPost = async (req, res) => {
    try {
        const id = req.params.id;
        const user = await User.findById(id)
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        const userResume = await UserResume.findOne({ UserId: id })
        if (!userResume) {
            return res.status(404).json({ message: 'User resume not found' });
        }
        const pendingPosts = userResume.Journey.filter(post => !post.isPosted); 
        if (pendingPosts.length === 0) {
            return res.status(404).json({ message: 'No pending posts found' });
        }

        res.status(200).json({ pendingPosts });
    }
    catch (err) {
        console.log(err)
        res.status(500).json({ message: err.message })
    }
}


const HandleAddAchievementPost = async (req, res) => {
    try {
        const userId = req.params.id;
        const { title, description, content, image_path, isAchivementPosted, achievementid } = req.body;

        // Validate required fields
        if (!title || !description || !content || !image_path || isAchivementPosted === undefined) {
            return res.status(400).json({ message: 'All required fields must be provided' });
        }

        // Check if user exists
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // If it's an achievement post, validate achievementid
        if (isAchivementPosted) {
            if (!achievementid) {
                return res.status(400).json({ message: 'Achievement ID is required for achievement posts' });
            }

            // Validate achievement exists in user's resume
            const userResume = await UserResume.findOne({
                _id: userId,
                'Journey._id': achievementid
            }, {
                'Journey.$': 1
            });

            if (!userResume || !userResume.Journey.length) {
                return res.status(404).json({ message: 'Achievement not found in user resume' });
            }
        }

        // Create new post object (conditionally add achievementid)
        const newPost = {
            title,
            description,
            content,
            image_path,
            isAchivementPosted
        };

        if (isAchivementPosted) {
            newPost.achievementid = achievementid;
        }

        // Find or create the user's Post document
        let userPost = await Post.findOne({ userid: userId });

        if (!userPost) {
            userPost = new Post({
                userid: userId,
                post: [newPost]
            });
        } else {
            userPost.post.push(newPost);
        }

        await userPost.save();

        return res.status(201).json({ message: 'Post added successfully', post: newPost });

    } catch (err) {
        console.error('Error adding post:', err);
        return res.status(500).json({ message: 'Internal server error' });
    }
};

const HandleLikePost = async (req, res) => {
    try {
        const { postId } = req.params; // ID of the post inside Post.post[]
        const { userId } = req.body;

        if (!userId || !postId) {
            return res.status(400).json({ message: 'User ID and Post ID are required' });
        }

        // Find the post document that contains the post with postId
        const postDoc = await Post.findOne({ 'post._id': postId });
        if (!postDoc) {
            return res.status(404).json({ message: 'Post not found' });
        }

        // Find the specific post
        const post = postDoc.post.id(postId);

        if (post.likes.includes(userId)) {
            return res.status(400).json({ message: 'You have already liked this post' });
        }

        post.likes.push(userId);
        await postDoc.save();

        return res.status(200).json({ message: 'Post liked successfully', likes: post.likes });
    } catch (err) {
        console.error('Error liking post:', err);
        return res.status(500).json({ message: 'Internal server error' });
    }
};


const HandleCommentPost = async (req, res) => {
    try {
        const { postId } = req.params;
        const { userId, comment } = req.body;

        if (!userId || !comment || !postId) {
            return res.status(400).json({ message: 'User ID, comment, and Post ID are required' });
        }

        if (comment.trim().length === 0) {
            return res.status(400).json({ message: 'Comment cannot be empty' });
        }

        const postDoc = await Post.findOne({ 'post._id': postId });
        if (!postDoc) {
            return res.status(404).json({ message: 'Post not found' });
        }

        const post = postDoc.post.id(postId);

        const newComment = {
            userId,
            comment,
            createdAt: new Date()
        };

        post.comments.push(newComment);
        await postDoc.save();

        return res.status(200).json({ message: 'Comment added successfully', comments: post.comments });
    } catch (err) {
        console.error('Error adding comment:', err);
        return res.status(500).json({ message: 'Internal server error' });
    }
};



module.exports = {
    HandlePandingPost,
    HandleAddAchievementPost
}