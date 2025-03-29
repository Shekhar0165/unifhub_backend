const Event = require("../../models/Event");
const User = require("../../models/User");
const Organization = require("../../models/Organizations");
const mongoose = require("mongoose");
const { addFirstEventAchievement } = require("./OrganizationJourney");
const { addEventScore } = require("./OrganizationActivity");

// Add a new event
const HandleAddEvent = async (req, res) => {
    try {
        const {
            organization_id, eventName, description, content,
            eventDate, time, venue, category,
            maxTeamMembers, minTeamMembers
        } = req.body;

        const img = req.file ? req.file.filename : "";

        // Validate input
        if (!organization_id || !eventName || !eventDate || !venue || !category || !maxTeamMembers || !minTeamMembers ||!img) {
            return res.status(400).json({ message: "All required fields must be provided" });
        }

        if (maxTeamMembers < minTeamMembers) {
            return res.status(400).json({ message: "maxTeamMembers cannot be less than minTeamMembers" });
        }

        // Check if the organization exists
        const organization = await Organization.findById(organization_id);
        if (!organization) {
            return res.status(404).json({ message: "Organization not found" });
        }

        // Determine event status
        const currentDate = new Date();
        const eventStatus = new Date(eventDate) < currentDate ? "past" : "upcoming";

        const newEvent = new Event({
            organization_id:organization_id, eventName, description, content, image_path:`/${img}`,
            eventDate, time, venue, category,
            maxTeamMembers, minTeamMembers,
            status: eventStatus,
            totalparticipants: 0,
            totalteams: 0
        });

        await newEvent.save();

        // Check if this is the organization's first event and add achievement
        const eventCount = await Event.countDocuments({ organization_id });
        if (eventCount === 1) {
            // Add first event achievement (don't wait for it to complete)
            addFirstEventAchievement(organization_id)
                .then(result => {
                    if (result) {
                        console.log(`First event achievement added for organization ${organization_id}`);
                    }
                })
                .catch(err => {
                    console.error("Error adding first event achievement:", err);
                });
        }

        // Update organization activity score
        try {
            await addEventScore(organization_id, newEvent);
            console.log(`Organization activity score updated for new event ${newEvent._id}`);
        } catch (err) {
            console.error("Error updating organization activity score:", err);
        }

        res.status(201).json({ message: "Event created successfully", event: newEvent });
    } catch (error) {
        res.status(500).json({ message: "Error creating event", error: error.message });
    }
};

const HandleUpdateEvents = async (req, res) => {
    try {
        const { eventId } = req.params;

        if (!mongoose.Types.ObjectId.isValid(eventId)) {
            return res.status(400).json({ message: "Invalid event ID" });
        }

        // Extract text fields from req.body
        const updatedData = { ...req.body };

        // If there's an image, handle it
        if (req.file) {
            updatedData.image = req.file.buffer; // Store image in DB (or save it to a folder)
        }

        const updatedEvent = await Event.findByIdAndUpdate(eventId, updatedData, { new: true });

        if (!updatedEvent) {
            return res.status(404).json({ message: "Event not found" });
        }

        res.status(200).json({ message: "Event updated successfully", event: updatedEvent });
    } catch (error) {
        res.status(500).json({ message: "Error updating event", error: error.message });
    }
};
// Delete an event
const HandleDeleteEvents = async (req, res) => {
    try {
        const { eventId } = req.params;
        const authId = req.user.id;
        
        if(!authId){
            return res.status(400).json({ message: "Invalid user ID" });
        }

        if (!mongoose.Types.ObjectId.isValid(eventId)) {
            return res.status(400).json({ message: "Invalid event ID" });
        }

        if(eventId !== authId){
            return res.status(400).json({ message: "You are not authorized to delete this event" });
        }

        await Event.findByIdAndDelete(eventId);

        const updatedEvents = await Event.find(); // Fetch remaining events
        return res.status(200).json(updatedEvents); // Return updated events list
    } catch (error) {
        console.error("Error deleting event:", error);
        return res.status(500).json({ message: "Failed to delete event" });
    }
};


// Declare positions of participants in an event
const HandleDeclarePostion = async (req, res) => {
    try {
        const { eventId } = req.params;
        const { participants } = req.body; // Array of participants with { participant_id, position }

        if (!mongoose.Types.ObjectId.isValid(eventId)) {
            return res.status(400).json({ message: "Invalid event ID" });
        }

        const event = await Event.findById(eventId);
        if (!event) {
            return res.status(404).json({ message: "Event not found" });
        }

        // Validate positions
        if (!Array.isArray(participants) || participants.length === 0) {
            return res.status(400).json({ message: "Participants data is required" });
        }

        event.participants = participants;
        event.status = "completed"; // Change status when declaring positions
        await event.save();

        res.status(200).json({ message: "Positions declared successfully", event });
    } catch (error) {
        res.status(500).json({ message: "Error declaring positions", error: error.message });
    }
};

// Get all events
const HandleGetAllEvents = async (req, res) => {
    try {
        const events = await Event.find()
            .populate("organization_id")

        res.status(200).json(events);
    } catch (error) {
        res.status(500).json({ message: "Error fetching events", error: error.message });
    }
};


const HandleGetEventByOrganization = async (req, res) => {
    try {
        const {_id}  = req.body;
        if (!mongoose.Types.ObjectId.isValid(_id)) {
            return res.status(400).json({ message: "Invalid organization ID" });
        }

        const events = await Event.find({organization_id:_id })
        res.status(200).json(events);
    } catch (error) {
        res.status(500).json({ message: "Error fetching events", error: error.message });
    }
}
const HandleGetOneEvent = async (req, res) => {
    try {
        const {_id}  = req.body;
        if (!mongoose.Types.ObjectId.isValid(_id)) {
            return res.status(400).json({ message: "Invalid organization ID" });
        }
        console.log("start")

        const events = await Event.find({_id})
        res.status(200).json(events);
    } catch (error) {
        res.status(500).json({ message: "Error fetching events", error: error.message });
    }
}

module.exports = { 
    HandleAddEvent, 
    HandleUpdateEvents, 
    HandleDeleteEvents, 
    HandleDeclarePostion, 
    HandleGetAllEvents, 
    HandleGetEventByOrganization,
    HandleGetOneEvent
};
