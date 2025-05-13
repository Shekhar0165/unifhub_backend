const mongoose = require('mongoose');

const ConversationSchema = new mongoose.Schema({
    participants: [{
        id: {
            type: mongoose.Schema.Types.ObjectId,
            required: true
        },
        type: {
            type: String,
            enum: ['user', 'organization'],
            required: true
        }
    }],
    lastMessage: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Message'
    },
    unreadCount: {
        type: Map,
        of: Number,
        default: new Map()
    }
}, { timestamps: true });

// Ensure participants combination is unique
ConversationSchema.index({ "participants.id": 1 }, { unique: true });

module.exports = mongoose.model('Conversation', ConversationSchema);