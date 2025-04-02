const Organization = require('../../models/Organizations');
const S3UploadHandler = require('../../middleware/s3Upload');

// Initialize S3 upload handler for organization files
const orgS3Handler = new S3UploadHandler('organizations');

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

// Handle getting a pre-signed URL for S3 uploads
const HandleGetUploadUrl = async (req, res) => {
    try {
        // This will set up and return a pre-signed URL
        return orgS3Handler.getUploadUrl(req, res);
    } catch (error) {
        console.error('Error generating upload URL:', error);
        return res.status(500).json({ 
            success: false, 
            message: 'Server error', 
            error: error.message 
        });
    }
};

// Update organization information
const HandleUpdateOrganization = async (req, res) => {
    try {
        const { id } = req.params;
        
        // Parse the orgData from FormData
        let updates = {};
        if (req.body.organizationData) {
            updates = JSON.parse(req.body.organizationData);
        } else {
            updates = { ...req.body };
        }
        console.log(updates)
        
        // Add file paths from S3 if files were uploaded
        if (req.files) {
            if (req.files.profileImage) {
                // Use S3 URL instead of local path
                updates.profileImage = req.files.profileImage[0].s3.url;
            }
            if (req.files.coverImage) {
                // Use S3 URL instead of local path
                updates.coverImage = req.files.coverImage[0].s3.url;
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
            members: members || []
        };
        
        organization.team.push(newTeam);
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

// Update social links for organization
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
        
        organization.socialLinks = socialLinks;
        await organization.save();
        
        res.status(200).json({ 
            message: 'Social links updated successfully',
            socialLinks: organization.socialLinks
        });
    } catch (error) {
        console.error('Error updating social links:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// Update a team member
const HandleUpdateTeamMember = async (req, res) => {
    try {
        const { id } = req.params; // Organization ID
        const { teamId, memberId, updates } = req.body;
        
        if (!teamId || !memberId || !updates) {
            return res.status(400).json({ message: 'Team ID, member ID, and updates are required' });
        }
        
        const organization = await Organization.findById(id);
        
        if (!organization) {
            return res.status(404).json({ message: 'Organization not found' });
        }
        
        // Find the team
        const team = organization.team.id(teamId);
        
        if (!team) {
            return res.status(404).json({ message: 'Team not found' });
        }
        
        // Find and update the member
        const memberIndex = team.members.findIndex(m => m._id.toString() === memberId);
        
        if (memberIndex === -1) {
            return res.status(404).json({ message: 'Team member not found' });
        }
        
        // Update member properties
        Object.keys(updates).forEach(key => {
            team.members[memberIndex][key] = updates[key];
        });
        
        await organization.save();
        
        res.status(200).json({ 
            message: 'Team member updated successfully',
            team: team
        });
    } catch (error) {
        console.error('Error updating team member:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
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
    HandleGetOrganizationForUser,
    HandleGetUploadUrl
};