const mongoose = require("mongoose");

const PostSchema = new mongoose.Schema({
    post: [{
        title: {
            type: String,
            required: true
        },
        description: {
            type: String,
            required: true
        },
        content: {
            type: String,
            required: true
        },
        image_path: {
            type: String,
            required: true
        },
        likes: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: "User"
        }],
        comments: [{
            userId: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'User',
                required: true
            },
            comment: {
                type: String,
                required: true
            },
            createdAt: {
                type: Date,
                default: Date.now
            }
        }],
        impressions: [{
            userId: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'User'
            },
            viewedAt: {
                type: Date,
                default: Date.now
            }
        }],
        type: {
            type: String,
            enum: ['post', 'event', 'organization', 'other'],
            default: 'post'
        },
        achievementid:{
            type: mongoose.Schema.Types.ObjectId,
        },
        isAchivementPosted:{
            type: Boolean,
            default: false
        }
    }],
    userid: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },

}, { timestamps: true });

const Post = mongoose.model("Post", PostSchema);

module.exports = Post;