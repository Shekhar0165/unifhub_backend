const express = require('express');
const router = express.Router();
const {
    HandleAddEvent,
    HandleUpdateEvents,
    HandleDeleteEvents,
    HandleDeclarePostion,
    HandleGetAllEvents,
    HandleRegisterForEvent,
    HandleGetEventByOrganization,
    HandleGetOneEvent,
} = require('../../Controllers/application/Events');
const auth = require('../../middleware/auth');  // Authentication middleware
const MulterConfig = require('../../config/Multer');
const ImageRenderer = require('../../config/ImageRender');

const EventUpdate = new MulterConfig('./public/Events').upload();
const ImageRender = new ImageRenderer('../public/Events');

// Route to add a new event (Protected: Requires authentication)
router.post('/add',auth, EventUpdate.single('image'),HandleAddEvent);

// Route to update an event by ID (Protected)
router.put('/update/:eventId', auth,EventUpdate.single('image'), HandleUpdateEvents);

// Route to delete an event by ID (Protected)
router.delete('/delete/:eventId', auth, HandleDeleteEvents);

// Route to declare winners/positions for an event (Protected)
router.post('/declare/:eventId', auth, HandleDeclarePostion);

router.post('/getevents',auth, HandleGetEventByOrganization);
router.post('/one',auth, HandleGetOneEvent);
// Route to get all events (Public)
router.get('/all', HandleGetAllEvents);


// Route to upload/update event image (Protected)
router.post('/upload/:eventId', auth, EventUpdate.single('image'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'No file uploaded' });
        }
        res.status(200).json({ message: 'Image uploaded successfully', filePath: req.file.path });
    } catch (error) {
        res.status(500).json({ message: 'Error uploading image', error: error.message });
    }
});

// Route to render/display event images
router.get('/images/:filename', (req, res) => ImageRender.renderImage(req, res));

module.exports = router;
