const User = require('../../models/User');
const bcrypt = require('bcrypt');

// Get a user by ID or email
const HandleGetUser = async (req, res) => {
    try {
        const id = req.user.id; // Authenticated user's ID'
        console.log('Authenticated User ID:', id);

        // Correct query to find user by ID
        const user = await User.findOne({ _id: id }).select('-password -refreshToken -otp');
        
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        
        res.status(200).json(user);
    } catch (error) {
        console.error('Error getting user:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};
const HandleGetForProfile = async (req, res) => {
    try {
        const id = req.params.userid; // Authenticated user's ID'
        console.log("profile",id)

        // Correct query to find user by ID
        const user = await User.findOne({ userid: id }).select('-password -refreshToken -otp');
        
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        
        res.status(200).json(user);
    } catch (error) {
        console.error('Error getting user:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};


const HandleSearchUser = async (req, res) => {
  try {
    const { query } = req.query;

    if (!query?.trim()) {
      return res.status(400).json({ success: false, message: "Search query is required." });
    }

    // Search users by `userid` using case-insensitive regex
    const members = await User.find(
      { userid: { $regex: `^${query}`, $options: "i" } } // Optimized regex for starts-with matching
    ).limit(10);
    // console.log(members)

    return res.status(200).json({ success: true, members });
  } catch (error) {
    console.error("Search error:", error.message);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};



// Update user information
const HanldeUpdateUser = async (req, res) => {
    try {
      const { id } = req.params;
      
      // Parse the userData from FormData
      let updates = {};
      if (req.body.userData) {
        updates = JSON.parse(req.body.userData);
      }
      
      // Add file paths if files were uploaded
      if (req.files) {
        if (req.files.profileImage) {
          updates.profileImage = `/user/${req.files.profileImage[0].filename}`;
        }
        if (req.files.coverImage) {
          updates.coverImage = `/user/${req.files.coverImage[0].filename}`;
        }
      }
      
      // Don't allow direct password updates through this route
      if (updates.password) {
        delete updates.password;
      }
      
      // Don't allow updating email without verification
      if (updates.email) {
        delete updates.email;
      }
      
      const user = await User.findByIdAndUpdate(
        id,
        { $set: updates },
        { new: true, runValidators: true }
      ).select('-password -refreshToken -otp');
      
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      
      res.status(200).json({ message: 'User updated successfully', user });
    } catch (error) {
      console.error('Error updating user:', error);
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  };

// Delete a user
const HandleDeleteUser = async (req, res) => {
    try {
        const { id } = req.params;
        
        const user = await User.findByIdAndDelete(id);
        
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        
        res.status(200).json({ message: 'User deleted successfully' });
    } catch (error) {
        console.error('Error deleting user:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};


// Update password with verification
const HandleUpdatePassword = async (req, res) => {
    try {
        const { id } = req.params;
        const { currentPassword, newPassword } = req.body;
        
        if (!currentPassword || !newPassword) {
            return res.status(400).json({ message: 'Current and new passwords are required' });
        }
        
        const user = await User.findById(id);
        
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        
        // Verify current password
        const isMatch = await bcrypt.compare(currentPassword, user.password);
        
        if (!isMatch) {
            return res.status(401).json({ message: 'Current password is incorrect' });
        }
        
        // Hash new password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(newPassword, salt);
        
        // Update password
        user.password = hashedPassword;
        await user.save();
        
        res.status(200).json({ message: 'Password updated successfully' });
    } catch (error) {
        console.error('Error updating password:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

module.exports = {
    HandleGetUser,
    HanldeUpdateUser,
    HandleDeleteUser,
    HandleUpdatePassword,
    HandleSearchUser,
    HandleGetForProfile
};