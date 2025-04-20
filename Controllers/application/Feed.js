const User = require('../../models/User');
const Post = require('../../models/Post');
const Event = require('../../models/Event');
const Organizations = require('../../models/Organizations');
const Following = require('../../models/Following');
const mongoose = require('mongoose');

/**
 * Helper function to safely convert strings to MongoDB ObjectIds
 * Filters out invalid IDs and properly creates ObjectId instances
 */
function safeObjectIds(idArray) {
    if (!idArray || !Array.isArray(idArray)) return [];
    return idArray
        .filter(id => mongoose.Types.ObjectId.isValid(id))
        .map(id => new mongoose.Types.ObjectId(id));
}

/**
 * Get user feed with personalized content
 * Feed contains:
 * - 30 posts from followed users
 * - 10 random posts
 * - 10 posts with high impressions
 * - 5 events
 * - 3 organizations
 */
const GetUserFeed = async (req, res) => {
    try {
        const userId = req.user.id; // Get user ID from auth middleware
        const { page = 1, limit = 10, lastSeen = [] } = req.body;
        console.log('User ID:', userId);
        console.log('Page:', req.body);
        
        // Find user follows
        const userFollowing = await Following.findOne({ userid: userId });
        
        // Get array of users this user follows
        const followingIds = userFollowing ? 
            userFollowing.list.map(follow => follow.followingid) : [];
            
        // Feed composition parameters
        const followedPostsCount = 30;
        const randomPostsCount = 10;
        const popularPostsCount = 10;
        const eventsCount = 5;
        const organizationsCount = 3;
        
        // Calculate skip value based on page number
        const skip = (page - 1) * limit;
        
        // Convert lastSeen array to valid MongoDB ObjectIds
        const validLastSeenIds = safeObjectIds(lastSeen);
        
        // Prepare query for filtering out already seen posts
        const notSeenFilter = validLastSeenIds.length > 0 ? 
            { 'post._id': { $nin: validLastSeenIds } } : {};
            
        // Get posts from followed users (30 posts)
        const followedPosts = followingIds.length > 0 ? 
            await Post.find({ 
                userid: { $in: followingIds },
                ...notSeenFilter
            })
            .sort({ createdAt: -1 })
            .limit(followedPostsCount)
            .populate('userid', 'name email profileImage')
            .lean() : [];
            
        // Get random posts (10 posts) - excluding posts from users the current user follows
        // and from the current user themselves
        const randomPosts = await Post.aggregate([
            { $match: { 
                userid: { 
                    $nin: [...followingIds, 
                          mongoose.Types.ObjectId.isValid(userId) ? new mongoose.Types.ObjectId(userId) : null]
                          .filter(id => id !== null)
                },
                ...(validLastSeenIds.length > 0 ? { 'post._id': { $nin: validLastSeenIds } } : {})
            }},
            { $sample: { size: randomPostsCount } },
            { $lookup: {
                from: 'users',
                localField: 'userid',
                foreignField: '_id',
                as: 'userDetails'
            }},
            { $unwind: '$userDetails' },
            { $project: {
                _id: 1,
                post: 1,
                createdAt: 1,
                updatedAt: 1,
                'user.name': '$userDetails.name',
                'user.email': '$userDetails.email',
                'user.profileImage': '$userDetails.profileImage',
                'user.userid':'$userDetails.userid'
            }}
        ]);
        
        // Get popular posts (10 posts with most impressions)
        const popularPosts = await Post.aggregate([
            { $match: validLastSeenIds.length > 0 ? { 'post._id': { $nin: validLastSeenIds } } : {} },
            { $unwind: '$post' },
            {
              $addFields: {
                impressionCount: {
                  $size: { $ifNull: ['$post.impressions', []] }
                }
              }
            },
            { $sort: { impressionCount: -1 } },
            { $limit: popularPostsCount },
            {
              $lookup: {
                from: 'users',
                localField: 'userid',
                foreignField: '_id',
                as: 'userDetails'
              }
            },
            { $unwind: '$userDetails' },
            {
              $project: {
                _id: 1,
                post: 1,
                impressionCount: 1,
                'user.name': '$userDetails.name',
                'user.email': '$userDetails.email',
                'user.profileImage': '$userDetails.profileImage',
                'user.userid':'$userDetails.userid'
              }
            }
          ]);
          
        
        // Get events (5 events)
        const events = await Event.find()
            .sort({ eventDate: 1 })
            .limit(eventsCount)
            .populate('organization_id', 'name profileImage');
            
        // Get organizations (3 organizations)
        const organizations = await Organizations.find()
            .sort({ createdAt: -1 })
            .limit(organizationsCount);
            
        // Format all posts for the feed
        let feedItems = [];
        
        // Add followed posts to feed
        if (followedPosts.length > 0) {
            followedPosts.forEach(postDoc => {
                if (postDoc.post && Array.isArray(postDoc.post)) {
                    postDoc.post.forEach(post => {
                        if (post && post._id) {
                            feedItems.push({
                                id: post._id,
                                type: 'post',
                                source: 'followed',
                                data: {
                                    ...post,
                                    user: postDoc.userid
                                }
                            });
                        }
                    });
                }
            });
        }
        
        // Add random posts to feed
        if (randomPosts.length > 0) {
            randomPosts.forEach(postDoc => {
                if (postDoc.post && Array.isArray(postDoc.post)) {
                    postDoc.post.forEach(post => {
                        if (post && post._id) {
                            feedItems.push({
                                id: post._id,
                                type: 'post',
                                source: 'random',
                                data: {
                                    ...post,
                                    user: postDoc.user
                                }
                            });
                        }
                    });
                }
            });
        }
        
        // Add popular posts to feed
        if (popularPosts.length > 0) {
            popularPosts.forEach(item => {
                if (item.post && item.post._id) {
                    feedItems.push({
                        id: item.post._id,
                        type: 'post',
                        source: 'popular',
                        impressionCount: item.impressionCount,
                        data: {
                            ...item.post,
                            user: item.user
                        }
                    });
                }
            });
        }
        
        // Add events to feed
        if (events.length > 0) {
            events.forEach(event => {
                if (event && event._id) {
                    feedItems.push({
                        id: event._id,
                        type: 'event',
                        data: event
                    });
                }
            });
        }
        
        // Add organizations to feed
        if (organizations.length > 0) {
            organizations.forEach(org => {
                if (org && org._id) {
                    feedItems.push({
                        id: org._id,
                        type: 'organization',
                        data: org
                    });
                }
            });
        }
        
        // Shuffle the feed items
        feedItems.sort(() => Math.random() - 0.5);
        
        // Trim to requested limit
        feedItems = feedItems.slice(0, limit);
        
        // Track impressions for posts in the feed
        const postIds = feedItems
            .filter(item => item.type === 'post' && item.id)
            .map(item => item.id);
            
        if (postIds.length > 0) {
            // Update impressions for posts
            await Promise.all(
                postIds.map(async (postId) => {
                    try {
                        await Post.updateOne(
                            { 'post._id': postId },
                            { 
                                $addToSet: { 
                                    'post.$.impressions': {
                                        userId,
                                        viewedAt: new Date()
                                    }
                                }
                            }
                        );
                    } catch (updateErr) {
                        console.error(`Error updating impression for post ${postId}:`, updateErr);
                    }
                })
            );
        }
        
        return res.status(200).json({
            message: 'Feed retrieved successfully',
            feed: feedItems,
            page,
            hasMore: feedItems.length === limit
        });
        
    } catch (err) {
        console.error('Error getting feed:', err);
        return res.status(500).json({ message: 'Internal server error' });
    }
};

/**
 * Mark post as viewed/record impression
 */
const RecordImpression = async (req, res) => {
    try {
        const { postId } = req.params;
        const userId = req.user.id;
        
        // Validate postId
        if (!mongoose.Types.ObjectId.isValid(postId)) {
            return res.status(400).json({ message: 'Invalid post ID format' });
        }
        
        // Find the post
        const postDoc = await Post.findOne({ 'post._id': postId });
        if (!postDoc) {
            return res.status(404).json({ message: 'Post not found' });
        }
        
        // Find the specific post
        const post = postDoc.post.id(postId);
        if (!post) {
            return res.status(404).json({ message: 'Specific post not found in document' });
        }
        
        // Check if impression already exists
        const alreadyViewed = post.impressions.some(
            impression => impression.userId && 
            impression.userId.toString() === userId
        );
        
        if (!alreadyViewed) {
            // Add impression
            post.impressions.push({
                userId,
                viewedAt: new Date()
            });
            
            await postDoc.save();
        }
        
        return res.status(200).json({ 
            message: 'Impression recorded successfully',
            impressionCount: post.impressions.length
        });
        
    } catch (err) {
        console.error('Error recording impression:', err);
        return res.status(500).json({ message: 'Internal server error' });
    }
};

/**
 * Get more feed items for infinite scrolling
 */
// Get more feed items for infinite scrolling
// Get more feed items for infinite scrolling
const GetMoreFeedItems = async (req, res) => {
    try {
        const userId = req.user.id;
        const { page, limit = 10, viewedPosts = [] } = req.body;
        console.log( page, limit, viewedPosts  )
        
        if (!page || page < 1) {
            return res.status(400).json({ message: 'Valid page number is required' });
        }
        
        // Create a new request object with the properties we need
        const newReq = {
            ...req,
            body: { page, limit, lastSeen: viewedPosts }
        };
        
        return GetUserFeed(newReq, res);
        
    } catch (err) {
        console.error('Error getting more feed items:', err);
        return res.status(500).json({ message: 'Internal server error' });
    }
};

module.exports = {
    GetUserFeed,
    RecordImpression,
    GetMoreFeedItems
};