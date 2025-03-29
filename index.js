const express = require("express");
require('dotenv').config()
const cors = require('cors');
// const path = require('path');
const corsOptions = require('./config/CorsOption');
const dbconnect = require('./config/dbConnect');
const credentialsMiddleware = require('./middleware/credentials');
// const ErrorHandler = require('./middleware/ErrorHandle');
// const Logger = require('./middleware/logger');
const cookieParser = require("cookie-parser");
// const cron = require('node-cron');
// const { scheduleDailyUpdate } = require('./Controllers/application/OrganizationJourney');

dbconnect.connect()
.then(() => console.log('Database connected successfully'))
.catch((err) => {
    console.error('Database connection failed', err);
    process.exit(1);
});
const app = express();

// app.use(express.static(path.join(__dirname, 'public')));


// Use credentials middleware before CORS
app.use(credentialsMiddleware);

// Handle options credentials check - before CORS!
// and fetch cookies credentials requirement
// app.use((req, res, next) => {
//     const origin = req.headers.origin;
//     if (corsOptions.origin && origin) {
//         res.header('Access-Control-Allow-Credentials', true);
//     }
//     next();
// });
   
app.use(cors(corsOptions));

app.use(cookieParser());

// Middleware to parse JSON and URL-encoded data
app.use(express.json());
// app.use(express.urlencoded({ extended: true }));


// Create an instance of the Logger class and use requestLogger
// const logger = new Logger();

// app.use(logger.requestLogger);


// Define a route

// Routes 
app.use('/', require('./routes/Register'));
app.use('/', require('./routes/RefreshToken'));
app.use('/user', require('./routes/api/User'));
app.use('/org', require('./routes/api/Organization'));
app.use('/reset', require('./routes/ResetPassword'));
app.use('/events',require('./routes/api/Events'))
app.use('/Participants',require('./routes/api/Participants'))
app.use('/team',require('./routes/api/Team'))
app.use('/journey',require('./routes/api/OrganizationJourney'))
app.use('/userevent',require('./routes/api/UserEvents'))
app.use('/userresume',require('./routes/api/UserResume'))
app.use('/events/teams',require('./routes/api/EventsMember'))
app.use('/user-activity', require('./routes/api/UserActivity'))
app.use('/org-reviews', require('./routes/api/OrganizationReview'))
app.use('/event-reviews', require('./routes/api/EventReview'))
app.use('/org-activity', require('./routes/api/OrganizationActivity'))


app.get("/", (req, res) => {
    res.send("Hello, World!");
});

// Schedule the daily organization journey update at midnight (00:00)
// cron.schedule('0 0 * * *', async () => {
//     console.log('Running scheduled organization journey update');
//     try {
//         const result = await scheduleDailyUpdate();
//         if (result.success) {
//             console.log(`Successfully updated ${result.count} organization journeys`);
//         } else {
//             console.error('Failed to update organization journeys:', result.error);
//         }
//     } catch (error) {
//         console.error('Error running scheduled journey update:', error);
//     }
// });

// Schedule daily user activity score recalculation at 1:00 AM
// cron.schedule('0 1 * * *', async () => {
//     console.log('Running scheduled user activity score recalculation');
//     try {
//         const UserActivityController = require('./Controllers/application/UserActivity');
//         const users = await require('./models/User').find({});
//         let successCount = 0;
        
//         for (const user of users) {
//             try {
//                 await UserActivityController.updateUserActivityAfterEvent(user._id);
//                 successCount++;
//             } catch (error) {
//                 console.error(`Error recalculating activity for user ${user._id}:`, error);
//             }
//         }
        
//         console.log(`Successfully recalculated activity scores for ${successCount} users`);
//     } catch (error) {
//         console.error('Error running scheduled activity recalculation:', error);
//     }
// });

// Schedule GitHub activity update for all users at 2:00 AM
// cron.schedule('0 2 * * *', async () => {
//     console.log('Running scheduled GitHub activity update');
//     try {
//         const User = require('./models/User');
//         // Import the function needed for GitHub updates
//         const { updateGitHubActivity } = require('./Controllers/application/UserActivity');
        
//         // Find users who have a GitHub username
//         const users = await User.find({ 'socialLinks.github': { $exists: true, $ne: '' } });
        
//         let successCount = 0;
        
//         for (const user of users) {
//             try {
//                 const githubActivity = await updateGitHubActivity(user._id);
//                 if (githubActivity) {
//                     successCount++;
//                 }
//             } catch (error) {
//                 console.error(`Error updating GitHub activity for user ${user._id}:`, error);
//             }
//         }
        
//         console.log(`Successfully updated GitHub activity for ${successCount} users`);
//     } catch (error) {
//         console.error('Error running scheduled GitHub activity update:', error);
//     }
// });

// Schedule daily organization activity update at 3:00 AM
// cron.schedule('0 3 * * *', async () => {
//     console.log('Running scheduled organization activity update');
//     try {
//         const { scheduleDailyOrganizationUpdate } = require('./Controllers/application/OrganizationActivity');
//         const result = await scheduleDailyOrganizationUpdate();
//         if (result.success) {
//             console.log(`Successfully updated activity for ${result.count} organizations`);
//         } else {
//             console.error('Failed to update organization activities:', result.error);
//         }
//     } catch (error) {
//         console.error('Error running scheduled organization activity update:', error);
//     }
// });

// Start the server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
