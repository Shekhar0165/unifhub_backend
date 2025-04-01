const UserActivity = require('../../models/UserActivity');
const User = require('../../models/User');
const Events = require('../../models/Event');
const Participants = require('../../models/Participants');
const EventsMember = require('../../models/EventsMember');
const Organizations = require('../../models/Organizations');
const mongoose = require('mongoose');
const githubIntegration = require('../../utils/githubIntegration');

// Scoring constants - can be adjusted as needed
const SCORE_CONSTANTS = {
    EVENT_PARTICIPATION_BASE: 10,
    EVENT_ORGANIZATION_HEAD: 50,
    EVENT_ORGANIZATION_VICE_HEAD: 30,
    EVENT_ORGANIZATION_MEMBER: 20,
    ORGANIZATION_MEMBERSHIP: 30,
    PARTICIPANT_MULTIPLIER: 0.05, // 5 points per 100 participants
    GITHUB_CONTRIBUTION_MULTIPLIER: 0.5, // GitHub contributions are weighted at 50% of platform activities
};

/**
 * Fetch and update GitHub activity for a user
 * @param {String} userId - User ID
 * @returns {Promise<Object>} Updated GitHub activity data
 */
const updateGitHubActivity = async (userId) => {
    try {
        // Find user and get GitHub username
        const user = await User.findById(userId);
        if (!user || !user.socialLinks || !user.socialLinks.github) {
            console.log(`No GitHub username found for user ${userId}`);
            return null;
        }
        
        const githubUsername = user.socialLinks.github.replace(/\/$/, "").split("/").pop();
        if(!githubUsername) {
            console.log(`No GitHub username found for user ${userId}`);
            return null;
        }
        // Extract just the username if a full URL was provided
        const usernameMatch = githubUsername.match(/github\.com\/([^\/]+)/);
        const username = usernameMatch ? usernameMatch[1] : githubUsername;
        
        if (!username) {
            console.log(`Invalid GitHub username for user ${userId}: ${githubUsername}`);
            return null;
        }
        
        // Find or create user activity record
        let userActivity = await UserActivity.findOne({ userId });
        if (!userActivity) {
            userActivity = new UserActivity({ userId });
        }
        
        // Initialize GitHub activity data if not exists
        if (!userActivity.githubActivity) {
            userActivity.githubActivity = {
                username,
                lastFetched: null,
                totalContributions: 0,
                score: 0,
                repositories: [],
                contributions: [],
                contributionCalendar: { totalContributions: 0, weeks: [] }
            };
        }
        
        // Set the username in case it changed
        userActivity.githubActivity.username = username;
        
        // Fetch GitHub data
        try {
            // Basic profile
            const profile = await githubIntegration.getUserProfile(username);
            
            // Repositories
            const repositories = await githubIntegration.getUserRepositories(username);
            
            // Contribution calendar (heatmap)
            const contributionCalendar = await githubIntegration.getContributionCalendar(username);
            
            // Recent contributions (last 30 days)
            const recentContributions = await githubIntegration.getRecentContributions(username, 30);
            
            // Calculate scores
            const scoreData = githubIntegration.calculateGitHubScore({
                profile,
                repositories,
                contributionCalendar,
                recentContributions
            });
            
            // Update GitHub activity data
            userActivity.githubActivity.lastFetched = new Date();
            userActivity.githubActivity.totalContributions = contributionCalendar.totalContributions;
            userActivity.githubActivity.score = Math.round(scoreData.totalScore * SCORE_CONSTANTS.GITHUB_CONTRIBUTION_MULTIPLIER);
            userActivity.githubActivity.repositories = scoreData.repositories;
            userActivity.githubActivity.contributionCalendar = contributionCalendar;
            
            // Add to total score
            userActivity.totalScore += userActivity.githubActivity.score;
            
            // Save the updated activity record
            await userActivity.save();
            console.log(`GitHub activity updated for user ${userId}, score: ${userActivity.githubActivity.score}`);
            
            return userActivity.githubActivity;
        } catch (error) {
            console.error(`Error fetching GitHub data for user ${userId} (${username}):`, error.message);
            return null;
        }
    } catch (error) {
        console.error('Error updating GitHub activity:', error);
        throw error;
    }
};

/**
 * Calculate user activity scores
 * @param {String} userId - User ID
 */
const calculateUserScore = async (userId) => {
    try {
        const objectId = new mongoose.Types.ObjectId(userId);
        
        // Find or create user activity record
        let userActivity = await UserActivity.findOne({ userId: objectId });
        if (!userActivity) {
            userActivity = new UserActivity({ userId: objectId });
        }

        // Reset scores for recalculation
        userActivity.totalScore = 0;
        
        // 1. Calculate event participation scores
        const participations = await Participants.find({
            'participant_id.userid': userId
        });

        userActivity.eventParticipation = [];
        
        for (const participation of participations) {
            const event = await Events.findOne({ _id: participation.eventid });
            if (event) {
                // Calculate score based on event size
                const participantCount = event.totalparticipants || 0;
                const score = SCORE_CONSTANTS.EVENT_PARTICIPATION_BASE + 
                    (participantCount * SCORE_CONSTANTS.PARTICIPANT_MULTIPLIER);
                
                userActivity.eventParticipation.push({
                    eventId: event._id,
                    eventName: event.eventName,
                    date: event.eventDate,
                    score: Math.round(score),
                    participantCount
                });
                
                userActivity.totalScore += Math.round(score);
            }
        }
        
        // 2. Calculate event organization scores
        const organizedEvents = await EventsMember.find({
            $or: [
                { eventHead: userId },
                { eventViceHead: userId },
                { 'eventTeams.members': userId }
            ]
        });
        
        userActivity.eventOrganization = [];
        
        for (const organized of organizedEvents) {
            const event = await Events.findOne({ _id: organized.eventId });
            if (event) {
                let role = 'member';
                let score = SCORE_CONSTANTS.EVENT_ORGANIZATION_MEMBER;
                
                if (organized.eventHead === userId) {
                    role = 'head';
                    score = SCORE_CONSTANTS.EVENT_ORGANIZATION_HEAD;
                } else if (organized.eventViceHead === userId) {
                    role = 'vice-head';
                    score = SCORE_CONSTANTS.EVENT_ORGANIZATION_VICE_HEAD;
                }
                
                // Add bonus for participant count
                const participantCount = event.totalparticipants || 0;
                score += (participantCount * SCORE_CONSTANTS.PARTICIPANT_MULTIPLIER);
                
                userActivity.eventOrganization.push({
                    eventId: event._id,
                    eventName: event.eventName,
                    role,
                    date: event.eventDate,
                    score: Math.round(score),
                    participantCount
                });
                
                userActivity.totalScore += Math.round(score);
            }
        }
        
        // 3. Calculate organization membership scores
        const organizations = await Organizations.find({
            'teams.members.id': userId
        });
        
        userActivity.organizationMembership = [];
        
        for (const org of organizations) {
            let role = 'member';
            let teamName = '';
            
            // Find the specific team and role
            for (const team of org.teams) {
                for (const member of team.members) {
                    if (member.id === userId) {
                        teamName = team.name;
                        if (team.head === userId) {
                            role = 'head';
                        }
                        break;
                    }
                }
            }
            
            const score = SCORE_CONSTANTS.ORGANIZATION_MEMBERSHIP;
            
            userActivity.organizationMembership.push({
                organizationId: org._id,
                organizationName: org.name,
                role,
                joinDate: new Date(), // Need actual join date if available
                score
            });
            
            userActivity.totalScore += score;
        }

        // 4. Fetch and update GitHub activity
        const githubActivity = await updateGitHubActivity(userId);
        if (githubActivity) {
            // GitHub score is already added to totalScore in updateGitHubActivity function
            console.log(`GitHub activity updated for user ${userId}, score: ${githubActivity.score}`);
        }
        
        // 5. Calculate weekly and monthly scores
        calculateTimeBasedScores(userActivity);
        
        // 6. Calculate streak and contribution data
        updateStreakAndContributions(userActivity);
        
        // Save the updated activity record
        // await userActivity.save();
        
        return userActivity;
    } catch (error) {
        console.error('Error calculating user score:', error);
        throw error;
    }
};

/**
 * Calculate weekly and monthly scores based on activities
 */
const calculateTimeBasedScores = (userActivity) => {
    // Get all activities with dates
    const activities = [
        ...userActivity.eventParticipation,
        ...userActivity.eventOrganization
    ];
    
    // Weekly scores
    const weeklyScores = {};
    // Monthly scores
    const monthlyScores = {};
    
    for (const activity of activities) {
        if (!activity.date) continue;
        
        // Get the start of the week (Sunday)
        const activityDate = new Date(activity.date);
        const weekStart = new Date(activityDate);
        weekStart.setDate(activityDate.getDate() - activityDate.getDay());
        weekStart.setHours(0, 0, 0, 0);
        
        // Get the start of the month
        const monthStart = new Date(activityDate.getFullYear(), activityDate.getMonth(), 1);
        
        // Add to weekly scores
        const weekKey = weekStart.toISOString();
        if (!weeklyScores[weekKey]) {
            weeklyScores[weekKey] = 0;
        }
        weeklyScores[weekKey] += activity.score;
        
        // Add to monthly scores
        const monthKey = monthStart.toISOString();
        if (!monthlyScores[monthKey]) {
            monthlyScores[monthKey] = 0;
        }
        monthlyScores[monthKey] += activity.score;
    }
    
    // Convert to arrays for storage
    userActivity.weeklyScores = Object.entries(weeklyScores).map(([week, score]) => ({
        week: new Date(week),
        score
    }));
    
    userActivity.monthlyScores = Object.entries(monthlyScores).map(([month, score]) => ({
        month: new Date(month),
        score
    }));
};

/**
 * Update streak and contribution data (GitHub-like)
 */
const updateStreakAndContributions = (userActivity) => {
    // Reset contribution data if needed
    if (!userActivity.contributionData) {
        userActivity.contributionData = Array(53).fill().map(() => Array(7).fill(0));
    }
    
    // Get all activity dates
    const activityDates = [
        ...userActivity.eventParticipation.map(e => e.date),
        ...userActivity.eventOrganization.map(e => e.date)
    ].filter(date => date);
    
    // Sort dates
    const sortedDates = activityDates.sort((a, b) => new Date(a) - new Date(b));
    
    if (sortedDates.length === 0) {
        userActivity.streak = {
            currentStreak: 0,
            longestStreak: 0,
            lastActivityDate: null
        };
        return;
    }
    
    // Calculate streak
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    let currentStreak = 0;
    let longestStreak = 0;
    let lastDate = null;
    
    // Find the most recent activity date
    const latestActivityDate = new Date(sortedDates[sortedDates.length - 1]);
    latestActivityDate.setHours(0, 0, 0, 0);
    
    // Check if the streak is still active (activity today or yesterday)
    const oneDayInMs = 24 * 60 * 60 * 1000;
    const daysSinceLastActivity = Math.floor((today - latestActivityDate) / oneDayInMs);
    
    if (daysSinceLastActivity <= 1) {
        // Streak is still active
        currentStreak = 1;
        
        // Count consecutive days with activity
        for (let i = sortedDates.length - 2; i >= 0; i--) {
            const date = new Date(sortedDates[i]);
            date.setHours(0, 0, 0, 0);
            
            const prevDate = new Date(sortedDates[i + 1]);
            prevDate.setHours(0, 0, 0, 0);
            
            const dayDifference = Math.floor((prevDate - date) / oneDayInMs);
            
            if (dayDifference === 1) {
                currentStreak++;
            } else {
                break;
            }
        }
        
        longestStreak = Math.max(currentStreak, userActivity.streak?.longestStreak || 0);
    } else {
        // Streak is broken
        currentStreak = 0;
        longestStreak = userActivity.streak?.longestStreak || 0;
    }
    
    userActivity.streak = {
        currentStreak,
        longestStreak,
        lastActivityDate: latestActivityDate
    };
    
    // Update contribution data (GitHub-like heatmap)
    // Reset first
    userActivity.contributionData = Array(53).fill().map(() => Array(7).fill(0));
    
    // Fill in contribution data for the past year
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
    
    for (const activityDate of activityDates) {
        const date = new Date(activityDate);
        if (date >= oneYearAgo) {
            // Calculate week and day position
            const weekNumber = getWeekNumber(date);
            const dayOfWeek = date.getDay();
            
            // Increment the contribution count
            if (userActivity.contributionData[weekNumber]) {
                userActivity.contributionData[weekNumber][dayOfWeek]++;
            }
        }
    }
};

/**
 * Get week number for GitHub-like contribution chart
 * @param {Date} date - Date to get week number for
 * @returns {Number} Week number (0-52)
 */
const getWeekNumber = (date) => {
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
    
    const diffTime = Math.abs(date - oneYearAgo);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return Math.floor(diffDays / 7);
};

/**
 * Get user activity data
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 */
exports.getUserActivity = async (req, res) => {
    try {
        const { userId } = req.params;
        
        if (!userId) {
            return res.status(400).json({ message: 'User ID is required' });
        }
        
        // Calculate latest activity scores
        const userActivity = await calculateUserScore(userId);
        console.log("funcstion over")
        
        // Get user details
        const user = await User.findById(userId);
        
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        await userActivity.populate();
        
        return res.status(200).json({
            message: 'User activity data retrieved successfully',
            data: {
                user: {
                    id: user._id,
                    name: user.name,
                    profileImage: user.profileImage
                },
                totalScore: userActivity.totalScore,
                eventParticipation: userActivity.eventParticipation,
                eventOrganization: userActivity.eventOrganization,
                organizationMembership: userActivity.organizationMembership,
                weeklyScores: userActivity.weeklyScores,
                monthlyScores: userActivity.monthlyScores,
                streak: userActivity.streak,
                contributionData: userActivity.contributionData
            }
        });
    } catch (error) {
        console.error('Error getting user activity:', error);
        return res.status(500).json({ message: 'Internal server error', error: error.message });
    }
};

/**
 * Recalculate all users' activity data
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 */
exports.recalculateAllUserActivity = async (req, res) => {
    try {
        const users = await User.find({});
        const updatedUsers = [];
        
        for (const user of users) {
            try {
                await calculateUserScore(user._id);
                updatedUsers.push(user._id);
            } catch (error) {
                console.error(`Error calculating score for user ${user._id}:`, error);
            }
        }
        
        return res.status(200).json({
            message: 'All user activity data recalculated successfully',
            updatedUsers
        });
    } catch (error) {
        console.error('Error recalculating all user activity:', error);
        return res.status(500).json({ message: 'Internal server error', error: error.message });
    }
};

/**
 * Get top users by activity score
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 */
exports.getTopUsers = async (req, res) => {
    try {
        const { limit = 10, period } = req.query;
        
        let query = {};
        
        // Filter by period if specified
        if (period) {
            const now = new Date();
            const periodStart = new Date();
            
            if (period === 'week') {
                periodStart.setDate(now.getDate() - 7);
            } else if (period === 'month') {
                periodStart.setMonth(now.getMonth() - 1);
            } else if (period === 'year') {
                periodStart.setFullYear(now.getFullYear() - 1);
            }
            
            query = {
                $or: [
                    { 'eventParticipation.date': { $gte: periodStart } },
                    { 'eventOrganization.date': { $gte: periodStart } }
                ]
            };
        }
        
        // Get top users by total score
        const topUsers = await UserActivity.find(query)
            .sort({ totalScore: -1 })
            .limit(parseInt(limit))
            .populate('userId', 'name profileImage');
        
        return res.status(200).json({
            message: 'Top users retrieved successfully',
            data: topUsers.map(user => ({
                userId: user.userId._id,
                name: user.userId.name,
                profileImage: user.userId.profileImage,
                totalScore: user.totalScore,
                streak: user.streak
            }))
        });
    } catch (error) {
        console.error('Error getting top users:', error);
        return res.status(500).json({ message: 'Internal server error', error: error.message });
    }
};

/**
 * Update user activity after event actions (participation, organization, etc.)
 * Can be called from other controllers after relevant actions
 */
exports.updateUserActivityAfterEvent = async (userId) => {
    try {
        await calculateUserScore(userId);
        return true;
    } catch (error) {
        console.error('Error updating user activity after event:', error);
        return false;
    }
};

/**
 * Connect GitHub account and fetch activity
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 */
exports.connectGitHub = async (req, res) => {
    try {
        const { userId } = req.params;
        const { githubUsername } = req.body;
        
        if (!userId || !githubUsername) {
            return res.status(400).json({ 
                message: 'User ID and GitHub username are required' 
            });
        }
        
        // Update user's GitHub username
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        
        // Update or initialize socialLinks if needed
        if (!user.socialLinks) {
            user.socialLinks = {};
        }
        
        user.socialLinks.github = githubUsername;
        await user.save();
        
        // Fetch and update GitHub activity
        const githubActivity = await updateGitHubActivity(userId);
        
        if (!githubActivity) {
            return res.status(404).json({ 
                message: 'Failed to fetch GitHub activity, please verify the username' 
            });
        }
        
        return res.status(200).json({
            message: 'GitHub account connected and activity fetched successfully',
            data: {
                githubUsername,
                githubActivity
            }
        });
    } catch (error) {
        console.error('Error connecting GitHub account:', error);
        return res.status(500).json({ 
            message: 'Internal server error', 
            error: error.message 
        });
    }
};

/**
 * Get GitHub activity for a user
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 */
exports.getGitHubActivity = async (req, res) => {
    try {
        const { userId } = req.params;
        
        if (!userId) {
            return res.status(400).json({ message: 'User ID is required' });
        }
        
        // Find user activity record
        const userActivity = await UserActivity.findOne({ userId });
        
        if (!userActivity || !userActivity.githubActivity) {
            return res.status(404).json({ 
                message: 'GitHub activity not found for this user' 
            });
        }
        
        // Check if data needs to be refreshed (older than 1 day)
        const lastFetched = userActivity.githubActivity.lastFetched;
        const oneDayAgo = new Date();
        oneDayAgo.setDate(oneDayAgo.getDate() - 1);
        
        let refreshed = false;
        if (!lastFetched || lastFetched < oneDayAgo) {
            // Refresh GitHub data
            const updatedActivity = await updateGitHubActivity(userId);
            refreshed = true;
        }
        
        return res.status(200).json({
            message: 'GitHub activity retrieved successfully',
            refreshed,
            data: userActivity.githubActivity
        });
    } catch (error) {
        console.error('Error getting GitHub activity:', error);
        return res.status(500).json({ 
            message: 'Internal server error', 
            error: error.message 
        });
    }
};

// Export the updateGitHubActivity function for use in scheduled jobs
exports.updateGitHubActivity = updateGitHubActivity;
