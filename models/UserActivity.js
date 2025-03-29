const mongoose = require('mongoose');

const UserActivitySchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    // Total score based on all activities
    totalScore: {
        type: Number,
        default: 0
    },
    // Activities broken down by type
    eventParticipation: [{
        eventId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Events'
        },
        eventName: String,
        date: Date,
        score: Number,
        participantCount: Number
    }],
    eventOrganization: [{
        eventId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Events'
        },
        eventName: String,
        role: String, // 'head', 'vice-head', 'member'
        date: Date,
        score: Number,
        participantCount: Number
    }],
    organizationMembership: [{
        organizationId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Organization'
        },
        organizationName: String,
        role: String,
        joinDate: Date,
        score: Number
    }],
    // GitHub activity tracking
    githubActivity: {
        username: String,
        lastFetched: Date,
        totalContributions: {
            type: Number,
            default: 0
        },
        score: {
            type: Number,
            default: 0
        },
        repositories: [{
            name: String,
            url: String,
            stars: Number,
            forks: Number,
            commits: Number,
            score: Number
        }],
        contributions: [{
            type: String, // 'commit', 'issue', 'pull_request', 'code_review'
            repoName: String,
            title: String,
            url: String,
            date: Date,
            score: Number
        }],
        // GitHub contribution heatmap data (directly from GitHub)
        contributionCalendar: {
            totalContributions: Number,
            weeks: [{
                contributionDays: [{
                    date: String,
                    contributionCount: Number,
                    color: String
                }]
            }]
        }
    },
    // Weekly activity scores
    weeklyScores: [{
        week: Date, // Start of the week
        score: Number
    }],
    // Monthly activity scores
    monthlyScores: [{
        month: Date, // Start of the month
        score: Number  
    }],
    // Activity streak data
    streak: {
        currentStreak: {
            type: Number,
            default: 0
        },
        longestStreak: {
            type: Number,
            default: 0
        },
        lastActivityDate: Date
    },
    // Contribution heatmap data (similar to GitHub)
    contributionData: {
        type: [[Number]],
        default: Array(53).fill().map(() => Array(7).fill(0)) // 53 weeks × 7 days
    },
    // Timestamps for creation and updates
}, { timestamps: true });

module.exports = mongoose.model('UserActivity', UserActivitySchema);
