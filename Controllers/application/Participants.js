const Participants = require('../../models/Participants')
const Event = require('../../models/Event')
const User = require('../../models/User')
const Organization = require('../../models/Organizations')
const { addUserAchievement, trackFirstEventCompletion } = require('./UserResume')
const { HandleCheckHighParticipation } = require('./OrganizationJourney')
const { updateUserActivityAfterEvent } = require('./UserActivity')

const HandleAddParticipants = async (req, res) => {
    try {
        const { eventid, participant_ids, teamName } = req.body;

        // Check if event exists
        const event = await Event.findById(eventid);
        if (!event) {
            return res.status(404).json({ message: "Event not found" });
        }

        // Ensure participant_ids is a valid array
        if (!Array.isArray(participant_ids) || participant_ids.length === 0) {
            return res.status(400).json({ message: "participant_ids should be a non-empty array" });
        }

        // Check if team name already exists
        const existingTeam = await Participants.findOne({ eventid, teamName });
        if (existingTeam) {
            return res.status(400).json({ message: "Team name already exists for this event" });
        }

        // Get user details for all participants
        const userIds = participant_ids;
        const users = await User.find({ _id: { $in: userIds } });
        
        if (users.length !== userIds.length) {
            return res.status(404).json({ message: "One or more participants not found" });
        }

        //any user are not paricipated in this event
        const alreadyParticipated = await Participants.findOne({ eventid, participant_id: { $in: userIds } });
        if (alreadyParticipated) {
            return res.status(400).json({ message: "One or more participants have already registered for this event" });
        }
        // Format participant data according to new schema
        const formattedParticipants = users.map(user => ({
            id: user._id.toString(),
            name: user.name,
            userid: user.userid,
            profileImage:user.profileImage ? user.profileImage : null
        }));

        // Create new participant entry
        const newParticipant = new Participants({
            eventid,
            teamName,
            participant_id: formattedParticipants,
            position: 0 // Default position as number
        });

        await newParticipant.save();

        // Update total participants count
        event.totalparticipants += formattedParticipants.length;
        event.totalteams += 1;
        await event.save();

        // Get organization details for achievement tracking
        const organization = await Organization.findById(event.organization_id);
        const orgName = organization ? organization.name : "Unknown organization";

        // Update each user's event list and add achievement for joining event
        await Promise.all(
            userIds.map(async (id) => {
                const user = await User.findById(id);
                if (user && !user.events.some(e => e.eventid.toString() === eventid)) {
                    // Add event to user's event list
                    user.events.push({ eventid, position: 0 });
                    await user.save();
                    
                    // Add achievement for registering for the event
                    await addUserAchievement(id, {
                        title: `Registered for ${event.eventName}`,
                        description: `Joined ${event.eventName} organized by ${orgName}.`,
                        metrics: {
                            achievementType: 'event_registration',
                            eventId: eventid,
                            organizationId: event.organization_id
                        }
                    });
                    
                    // Update user activity score
                    await updateUserActivityAfterEvent(id);
                }
            })
        );

        // Check for high participation achievement after adding new participants
        // Run in background to avoid blocking the response
        if (event.totalparticipants >= 100) {
            HandleCheckHighParticipation(eventid, event.organization_id)
                .then(result => {
                    if (result) {
                        console.log(`High participation achievement checked for event ${eventid}`);
                    }
                })
                .catch(err => {
                    console.error("Error checking high participation achievement:", err);
                });
        }

        res.status(201).json({
            message: "Participants added successfully",
            participants: newParticipant
        });
    } catch (error) {
        res.status(500).json({ message: "Error registering for event", error: error.message });
    }
};



const HandleUpdateParticipantsTeam = async (req,res)=>{
    try {
        const { eventid, teamName, participant_ids } = req.body;
        console.log({ eventid, teamName, participant_ids })
        
        // Validate required fields
        if (!eventid || !teamName || !participant_ids) {
            return res.status(400).json({ message: "Event ID, team name, and participant IDs are required" });
        }

        // Check if event exists
        const event = await Event.findById(eventid);
        if (!event) {
            return res.status(404).json({ message: "Event not found" });
        }

        // Check if team exists
        const team = await Participants.findOne({ eventid, teamName });
        if (!team) {
            return res.status(404).json({ message: "Team not found" });
        }

        // Ensure participant_ids is a valid array
        if (!Array.isArray(participant_ids) || participant_ids.length === 0) {
            return res.status(400).json({ message: "participant_ids should be a non-empty array" });
        }

        // Get user details for all participants
        const userIds = participant_ids;
        const users = await User.find({ _id: { $in: userIds } });
        
        if (users.length !== userIds.length) {
            return res.status(404).json({ message: "One or more participants not found" });
        }

        // Format participant data according to schema
        const formattedParticipants = users.map(user => ({
            id: user._id.toString(),
            name: user.name,
            userid: user.userid,
            profileImage: user.profileImage ? user.profileImage : ''
        }));
        
        const updatedParticipant = await Participants.findOneAndUpdate(
            { eventid, teamName },
            { $push: { participant_id: { $each: formattedParticipants } } },
            { new: true }
        );

        // Update total participants count
        event.totalparticipants += formattedParticipants.length;
        await event.save();

        // Get organization details for achievement tracking
        const organization = await Organization.findById(event.organization_id);
        const orgName = organization ? organization.name : "Unknown organization";

        // Update each user's event list and add achievement for joining event
        await Promise.all(
            userIds.map(async (id) => {
                const user = await User.findById(id);
                if (user && !user.events.some(e => e.eventid.toString() === eventid)) {
                    // Add event to user's event list
                    user.events.push({ eventid, position: 0 });
                    await user.save();
                    
                    // Add achievement for registering for the event
                    await addUserAchievement(id, {
                        title: `Registered for ${event.eventName}`,
                        description: `Joined ${event.eventName} organized by ${orgName}.`,
                        metrics: {
                            achievementType: 'event_registration',
                            eventId: eventid,
                            organizationId: event.organization_id
                        }
                    });
                }
            })
        );

        res.status(200).json({
            message: "Participants team updated successfully",
            participant: updatedParticipant
        });
    } catch (error) {
        res.status(500).json({ message: "Error updating participants team", error: error.message });
    }
}

const HandleGetAllParticipants = async (req, res) => {
    try {
        const { eventid } = req.query;

        // If eventid is provided, filter by event
        const filter = eventid ? { eventid } : {};

        // Get all participants
        const participants = await Participants.find(filter)
            .sort({ position: 1, createdAt: 1 });

        res.status(200).json({
            message: "Participants retrieved successfully",
            count: participants.length,
            participants
        });
    } catch (error) {
        res.status(500).json({ message: "Error retrieving participants", error: error.message });
    }
}

const HandleUpdateParticipants = async (req, res) => {
    try {
        const { id } = req.params;
        const { teamName, position } = req.body;


        // Find participant by id
        const participant = await Participants.findById(id);
        if (!participant) {
            return res.status(404).json({ message: "Participant not found" });
        }

        // If team name is being updated, check for duplicates
        if (teamName && teamName !== participant.teamName) {
            const existingTeam = await Participants.findOne({
                eventid: participant.eventid,
                teamName,
                _id: { $ne: id } // Exclude current participant
            });

            if (existingTeam) {
                return res.status(400).json({ message: "Team name already exists for this event" });
            }
        }

        // Convert position to number if provided
        const updates = {};
        if (teamName) updates.teamName = teamName;
        if (position !== undefined) updates.position = Number(position);

        // Update the participant
        const updatedParticipant = await Participants.findByIdAndUpdate(
            id,
            updates,
            { new: true, runValidators: true }
        );

        res.status(200).json({
            message: "Participant updated successfully",
            participant: updatedParticipant
        });
    } catch (error) {
        res.status(500).json({ message: "Error updating participant", error: error.message });
    }
}

const HandleDeleteParticipants = async (req, res) => {
    try {
        const { id } = req.params;
        console.log({ id })

        // Find and delete participant
        const deletedParticipant = await Participants.findByIdAndDelete(id);

        if (!deletedParticipant) {
            return res.status(404).json({ message: "Participant not found" });
        }

        res.status(200).json({
            message: "Participant deleted successfully",
            participant: deletedParticipant
        });
    } catch (error) {
        res.status(500).json({ message: "Error deleting participant", error: error.message });
    }
}

const HandleDeleteTeam = async (req, res) => {
    try {
        const { eventid, teamName } = req.query;

        if (!eventid || !teamName) {
            return res.status(400).json({ message: "Event ID and team name are required" });
        }

        // Delete all participants with the given team name in the specified event
        const result = await Participants.deleteMany({ eventid, teamName });

        if (result.deletedCount === 0) {
            return res.status(404).json({ message: "Team not found or already deleted" });
        }

        res.status(200).json({
            message: "Team deleted successfully",
            deletedCount: result.deletedCount
        });
    } catch (error) {
        res.status(500).json({ message: "Error deleting team", error: error.message });
    }
}

const HandleDeclareResult = async (req, res) => {
    try {
        const { eventid, results } = req.body;

        console.log({ eventid, results });

        // Validate event exists
        const event = await Event.findById(eventid);
        if (!event) {
            return res.status(404).json({ message: "Event not found" });
        }

        // Extract only the date part (YYYY-MM-DD) from eventDate and current date
        const eventDate = event.eventDate.toISOString().slice(0, 10);
        const currentDate = new Date().toISOString().slice(0, 10);

        console.log("Event Date:", eventDate);
        console.log("Current Date:", currentDate);

        // Check if event date is different from today's date
        if (eventDate !== currentDate) {
            return res.status(400).json({ message: "Event has not started yet." });
        }

        // Check if event is ongoing
        if (event.status !== "ongoing") {
            return res.status(400).json({ message: "Event is not Completed Yet" });
        }

        // Validate results array
        if (!Array.isArray(results) || results.length === 0) {
            return res.status(400).json({ message: "Results must be a non-empty array" });
        }

        // Get organization details
        const organization = await Organization.findById(event.organization_id);
        const orgName = organization ? organization.name : "Unknown organization";

        // Update positions for teams
        const updatePromises = results.map((result) => {
            return Participants.findOneAndUpdate(
                { eventid, teamName: result.teamName },
                { position: Number(result.position) },
                { new: true }
            );
        });

        const updatedParticipants = await Promise.all(updatePromises);

        // Update event status to completed
        await Event.findByIdAndUpdate(eventid, { status: "completed" });

        // Add achievements for participants
        for (const team of updatedParticipants) {
            if (!team) continue;
            if (team.position === 0) continue;

            for (const participant of team.participant_id) {
                const userId = participant.id;

                // Track first event completion
                await trackFirstEventCompletion(userId, eventid, event.eventName, orgName);

                // Create achievement based on position
                let title = `Participated in ${event.eventName}`;
                let description = `Completed ${event.eventName} organized by ${orgName}.`;

                if (team.position === 1) {
                    title = `Won first place in ${event.eventName}`;
                    description = `Won first place in ${event.eventName} organized by ${orgName}.`;
                } else if (team.position === 2) {
                    title = `Won second place in ${event.eventName}`;
                    description = `Won second place in ${event.eventName} organized by ${orgName}.`;
                } else if (team.position === 3) {
                    title = `Won third place in ${event.eventName}`;
                    description = `Won third place in ${event.eventName} organized by ${orgName}.`;
                }

                await addUserAchievement(userId, {
                    title,
                    description,
                    date: new Date(),
                    metrics: {
                        achievementType: "event_completion",
                        eventId: eventid,
                        position: team.position,
                        organizationId: event.organization_id,
                    },
                });
            }
        }

        res.status(200).json({
            message: "Results declared successfully",
            updatedParticipants,
        });
    } catch (error) {
        console.error("Error declaring results:", error);
        res.status(500).json({ message: "Error declaring results", error: error.message });
    }
};


const HandleEditResult = async (req, res) => {
    try {
        const { eventid, teamName, position } = req.body;

        if (!eventid || !teamName || position === undefined) {
            return res.status(400).json({
                message: "Event ID, team name, and position are required"
            });
        }

        // Validate event exists
        const event = await Event.findById(eventid);
        if (!event) {
            return res.status(404).json({ message: "Event not found" });
        }

        // Find and update team position
        const updatedParticipant = await Participants.findOneAndUpdate(
            { eventid, teamName },
            { position: Number(position) },
            { new: true, runValidators: true }
        );

        if (!updatedParticipant) {
            return res.status(404).json({
                message: "Team not found for this event"
            });
        }

        res.status(200).json({
            message: "Result updated successfully",
            participant: updatedParticipant
        });
    } catch (error) {
        res.status(500).json({ message: "Error updating result", error: error.message });
    }
}

const HandleCheckTeam = async (req, res) => {
    try {
        const { teamName, eventid } = req.body;

        // Validate input
        if (!teamName || !eventid) {
            return res.status(400).json({ message: "Team name and event ID are required." });
        }

        // Find if the team name already exists for the given event
        const existingTeam = await Participants.findOne({ eventid, teamName });

        if (existingTeam) {
            return res.status(200).json({ result: false });
        } else {
            return res.status(200).json({ result: true });
        }
    } catch (error) {
        console.error("Error checking team name:", error);
        return res.status(500).json({ message: "Internal Server Error" });
    }
};

const HandleGetParticipantsByEvent = async (req, res) => {
    try {
        const { eventid } = req.params;

        // Find all participants for the given event
        const participants = await Participants.find({ eventid });

        if (participants.length === 0) {
            return res.status(404).json({ 
                message: "No participants found for this event", 
                count: 0, 
                participants: [] 
            });
        }

        console.log(participants);

        res.status(200).json({
            message: "Participants retrieved successfully",
            count: participants.length,
            participants
        });
    } catch (error) {
        res.status(500).json({ 
            message: "Error retrieving participants", 
            error: error.message 
        });
    }
}

const HandleGetParticipantsByUserId = async (req, res) => {
    try {
        const { eventid, userid } = req.body;

        // Find participants where participant_id array contains an object with the given userid
        const participants = await Participants.find({
            eventid: eventid,
            "participant_id.id": userid
        });

        if (participants.length === 0) {
            return res.status(404).json({
                message: "No participants found for this user ID",
                count: 0,
                participants: []
            });
        }

        // Get the team details
        const team = participants[0];

        // Fetch user details including profile image
        const formattedParticipants = await Promise.all(
            team.participant_id.map(async (user) => {
                const findUser = await User.findById(user.id);
                return {
                    ...user.toObject(),
                    ProfileImage: findUser?.profileImage || ""
                };
            })
        );

        res.status(200).json({
            message: "Participants retrieved successfully",
            count: formattedParticipants.length,
            newParticipants: {
                teamName: team.teamName,
                participants: formattedParticipants
            }
        });
    } catch (error) {
        console.error("Error retrieving participants:", error);
        res.status(500).json({
            message: "Error retrieving participants",
            error: error.message
        });
    }
};


module.exports = {
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
    HandleUpdateParticipantsTeam
}