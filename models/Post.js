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
        like:{
            type: mongoose.Schema.Types.ObjectId,
            ref: "Like"
        },
        comment:{
            type: mongoose.Schema.Types.ObjectId,
            ref: "Comment"
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

const UserResume = mongoose.model("Post",PostSchema);

module.exports = UserResume;