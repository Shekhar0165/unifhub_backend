const express = require('express');
const router = express.Router();
const {
    HandleGetOrganization,
    HandleUpdateOrganization,
    HandleDeleteOrganization,
    HandleAddUpcomingEvent,
    HandleAddEvent,
    HandleAddTeam,
    HandleUpdateSocialLinks,
    HandleGetAllOrganization,
    HandleUpdateTeamMember,
    HandleGetOrganizationForUser
} = require('../../Controllers/application/Organizations');
const auth = require('../../middleware/auth');
const MulterConfig = require('../../config/Multer');
const ImageRenderer = require('../../config/ImageRender');
const MulterToS3 = require('../../middleware/multerToS3');

// Initialize Multer
const OrgUpdate = new MulterConfig('./public/Organizations').upload();
const ImageRender = new ImageRenderer('../public/Organizations');

// Initialize S3 upload handler for organization files
const s3Upload = new MulterToS3();

// Protected routes - require authentication
router.get('/', auth, HandleGetOrganization);
router.post('/one', auth, HandleGetOrganizationForUser);
router.get('/all', auth, HandleGetAllOrganization);

// Update organization info with file upload to S3
router.put('/:id', auth, 
    OrgUpdate.fields([
        { name: 'profileImage', maxCount: 1 },
        { name: 'coverImage', maxCount: 1 }
    ]), 
    s3Upload.uploadToS3('organizations'),
    HandleUpdateOrganization
);

router.delete('/:id', auth, HandleDeleteOrganization);

// Additional organization-specific routes
router.post('/:id/upcoming-event', auth, HandleAddUpcomingEvent);
router.post('/:id/event', auth, HandleAddEvent);
router.put('/update-team/:id', auth, HandleUpdateTeamMember);
router.post('/team/:id', auth, HandleAddTeam);
router.put('/:id/social-links', auth, HandleUpdateSocialLinks);

// Keep the image renderer for backward compatibility
router.get('/:filename', (req, res) => ImageRender.renderImage(req, res));

module.exports = router;