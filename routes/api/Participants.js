const express = require('express');
const router = express.Router();
const {
    HandleAddParticipants,
    HandleGetAllParticipants,
    HandleUpdateParticipants,
    HandleDeleteParticipants,
    HandleDeleteTeam,
    HandleDeclareResult,
    HandleEditResult,
    HandleCheckTeam,
    HandleGetParticipantsByEvent,
    HandleGetParticipantsByUserId,
    HandleUpdateParticipantsTeam,
    HandleSearchParticipants
} = require('../../Controllers/application/Participants');
const auth = require('../../middleware/auth');



// Route to register a user for an event (Protected)
router.post('/register', auth, HandleAddParticipants);
router.post('/check-team', HandleCheckTeam);
router.get('/all', HandleGetAllParticipants);
router.get('/for-events/:eventid', HandleGetParticipantsByEvent);
router.post('/user', auth, HandleGetParticipantsByUserId);
router.post('/declareResult',auth, HandleDeclareResult);
router.post('/update-team', HandleUpdateParticipantsTeam);
router.post('/available/search',auth, HandleSearchParticipants);



module.exports = router;
