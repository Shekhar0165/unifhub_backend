const mongoose = require('mongoose');

const FollowSchema = new mongoose.Schema({
    userid: {
            type: mongoose.Schema.Types.ObjectId,
            required: true
        },
        list: [{  
            followingid: {
                type: String
            },
            image_path: {
                type: String,
                required: true 
            },
            bio: {
                type: String,
                // required: true,
            },
            name:{
                type:String,
                require:true
            },
            userid:{
                type:String,
                require:true
            }
        }]
}, { timestamps: true });

module.exports = mongoose.model('following', FollowSchema); 