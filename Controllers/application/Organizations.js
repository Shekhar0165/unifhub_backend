const Organization = require('../../models/Organizations');

// Get an organization by ID
const HandleGetOrganization = async (req, res) => {
    try {
        const id = req.user.id; 
        console.log('Organization ID:', id);

        const organization = await Organization.findById(id);
        
        if (!organization) {
            return res.status(404).json({ message: 'Organization not found' });
        }
        
        res.status(200).json(organization);
    } catch (error) {
        console.error('Error getting organization:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};
const HandleGetOrganizationForUser = async (req, res) => {
    try {
        const {userid }= req.body; 

        const organization = await Organization.findOne({userid:userid});
        
        if (!organization) {
            return res.status(404).json({ message: 'Organization not found' });
        }
        
        res.status(200).json(organization);
    } catch (error) {
        console.error('Error getting organization:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};
const HandleGetAllOrganization = async (req, res) => {
    try {
        const organization = await Organization.find({});
        if (!organization) {
            return res.status(404).json({ message: 'Organization not found' });
        }
        
        res.status(200).json(organization);
    } catch (error) {
        console.error('Error getting organization:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// Update organization information
const HandleUpdateOrganization = async (req, res) => {
    try {
        const { id } = req.params;
        
        // Parse the orgData from FormData
        let updates = {};
        if (req.body.orgData) {
            updates = JSON.parse(req.body.orgData);
        }
        
        // Add file paths if files were uploaded
        if (req.files) {
            if (req.files.profileImage) {
                updates.profileImage = `/org/${req.files.profileImage[0].filename}`;
            }
            if (req.files.coverImage) {
                updates.coverImage = `/org/${req.files.coverImage[0].filename}`;
            }
        }
        
        // Don't allow updating email without verification
        if (updates.email) {
            delete updates.email;
        }
        
        const organization = await Organization.findByIdAndUpdate(
            id,
            { $set: updates },
            { new: true, runValidators: true }
        );
        
        if (!organization) {
            return res.status(404).json({ message: 'Organization not found' });
        }
        
        res.status(200).json({ message: 'Organization updated successfully', organization });
    } catch (error) {
        console.error('Error updating organization:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// Delete an organization
const HandleDeleteOrganization = async (req, res) => {
    try {
        const { id } = req.params;
        
        const organization = await Organization.findByIdAndDelete(id);
        
        if (!organization) {
            return res.status(404).json({ message: 'Organization not found' });
        }
        
        res.status(200).json({ message: 'Organization deleted successfully' });
    } catch (error) {
        console.error('Error deleting organization:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// Add an upcoming event to organization
const HandleAddUpcomingEvent = async (req, res) => {
    try {
        const { id } = req.params;
        const { title, date, organizer, location } = req.body;
        
        if (!title || !date || !organizer || !location) {
            return res.status(400).json({ message: 'All event fields are required' });
        }
        
        const organization = await Organization.findById(id);
        
        if (!organization) {
            return res.status(404).json({ message: 'Organization not found' });
        }
        
        const newEvent = {
            title,
            date: new Date(date),
            organizer,
            location
        };
        
        organization.upcomingEvents.push(newEvent);
        await organization.save();
        
        res.status(201).json({ 
            message: 'Upcoming event added successfully',
            event: newEvent
        });
    } catch (error) {
        console.error('Error adding upcoming event:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// Add a past event to organization
const HandleAddEvent = async (req, res) => {
    try {
        const { id } = req.params;
        const { title, position, date, participants, team } = req.body;
        
        if (!title || !date) {
            return res.status(400).json({ message: 'Title and date are required' });
        }
        
        const organization = await Organization.findById(id);
        
        if (!organization) {
            return res.status(404).json({ message: 'Organization not found' });
        }
        
        const newEvent = {
            title,
            position: position || [],
            date: new Date(date),
            participants: participants || 0,
            team: team ? team.map(member => new Map(Object.entries(member))) : []
        };
        
        organization.events.push(newEvent);
        
        // Update activity data
        organization.activities.thisMonth += 1;
        organization.activities.thisYear += 1;
        
        await organization.save();
        
        res.status(201).json({ 
            message: 'Event added successfully',
            event: newEvent
        });
    } catch (error) {
        console.error('Error adding event:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// Add a team to organization
const HandleAddTeam = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, head, members } = req.body;
        
        if (!name || !head) {
            return res.status(400).json({ message: 'Team name and head are required' });
        }
        
        const organization = await Organization.findById(id);
        
        if (!organization) {
            return res.status(404).json({ message: 'Organization not found' });
        }
        
        const newTeam = {
            name,
            head,
            members: members ? members.map(member => new Map(Object.entries(member))) : []
        };
        
        organization.teams.push(newTeam);
        await organization.save();
        
        res.status(201).json({ 
            message: 'Team added successfully',
            team: newTeam
        });
    } catch (error) {
        console.error('Error adding team:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// Update organization social links
const HandleUpdateSocialLinks = async (req, res) => {
    try {
        const { id } = req.params;
        const { socialLinks } = req.body;
        
        if (!socialLinks) {
            return res.status(400).json({ message: 'Social links are required' });
        }
        
        const organization = await Organization.findById(id);
        
        if (!organization) {
            return res.status(404).json({ message: 'Organization not found' });
        }
        
        // Create a new Map from the provided socialLinks object
        organization.socialLinks = new Map(Object.entries(socialLinks));
        
        await organization.save();
        
        res.status(200).json({ 
            message: 'Social links updated successfully',
            socialLinks: Object.fromEntries(organization.socialLinks)
        });
    } catch (error) {
        console.error('Error updating social links:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

const HandleUpdateTeamMember = async (req, res) => {
    try {
        const { id } = req.params;  // Extracting id from request parameters
        const updatedTeam = req.body;  // Extracting updated team data from request body

        // Find the organization by ID
        const org = await Organization.findById(id);

        // Check if organization exists
        if (!org) {
            return res.status(404).json({
                success: false,
                message: "Organization not found"
            });
        }

        // Find the team and update members
        let teamFound = false;
        org.teams.forEach(team => {
            if (team.name === updatedTeam.name) {
                team.members = updatedTeam.members;
                teamFound = true;
            }
        });

        if (!teamFound) {
            return res.status(404).json({
                success: false,
                message: "Team not found"
            });
        }

        // Save the updated organization
        await org.save();

        res.status(200).json({
            success: true,
            message: "Team member updated successfully",
            organization: org  // Returning the updated organization
        });

    } catch (error) {  // Handling errors
        console.error("Failed to update team member:", error);
        res.status(500).json({
            success: false,
            message: "Failed to update team member",
            error: error.message  // Returning error message
        });
    }
};




module.exports = {
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
};