const express = require('express');
const router = express.Router();
const {
    HandleAddEvent,
    HandleUpdateEvents,
    HandleDeleteEvents,
    HandleGetAllEvents,
    HandleRegisterForEvent,
    HandleGetEventByOrganization,
    HandleGetOneEvent,
    HandleUPComingEventsForUser
} = require('../../Controllers/application/Events');
const auth = require('../../middleware/auth');  // Authentication middleware
const MulterConfig = require('../../config/Multer');
const ImageRenderer = require('../../config/ImageRender');
const MulterToS3 = require('../../middleware/multerToS3');
const S3UploadHandler = require('../../middleware/s3Upload'); // Assuming you have a middleware for S3 upload

// Initialize Multer
const EventUpdate = new MulterConfig('./public/Events').upload();
const ImageRender = new ImageRenderer('../public/Events');

// Initialize S3 upload handler for events files
const s3Upload = new MulterToS3();

// Route to add a new event (Protected: Requires authentication)
router.post('/add', auth, EventUpdate.single('image'), s3Upload.uploadToS3('events'), HandleAddEvent);

// Route to update an event by ID (Protected)
router.put('/update/:eventId', auth, EventUpdate.single('image'), s3Upload.uploadToS3('events'), HandleUpdateEvents);

// Route to delete an event by ID (Protected)
router.delete('/delete/:eventId', auth, HandleDeleteEvents);

router.get('/upcoming/:userId', HandleUPComingEventsForUser);


router.post('/getevents', auth, HandleGetEventByOrganization);
router.post('/one', auth, HandleGetOneEvent);

// Route to get all events (Public)
router.get('/all', HandleGetAllEvents);

// Route to upload/update event image (Protected)
router.post('/upload/:eventId', auth, EventUpdate.single('image'), s3Upload.uploadToS3('events'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'No file uploaded' });
        }
        
        // Return S3 URL instead of local path
        res.status(200).json({ 
            message: 'Image uploaded successfully', 
            fileUrl: req.file.s3.url,
            fileKey: req.file.s3.key
        });
    } catch (error) {
        res.status(500).json({ message: 'Error uploading image', error: error.message });
    }
});


module.exports = router;
