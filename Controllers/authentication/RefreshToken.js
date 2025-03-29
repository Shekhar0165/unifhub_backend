const jwt = require('jsonwebtoken');
const User = require('../../models/User');
const Organization = require('../../models/Organizations');

const handleRefreshToken = async (req, res) => {
    // Try to get the token from cookie first, then from request body
    const token = req.cookies.refreshToken || req.body.refreshToken;

    if (!token) {
        return res.status(401).json({ message: 'Refresh token is required.' });
    }
    try {
        // Verify the refresh token
        const decoded = jwt.verify(token, process.env.REFRESH_TOKEN_SECRET);
        
        // Check if it's a user or an organization
        let account;
        let userType;
        
        // Try to find as user first
        account = await User.findById(decoded.id);
        if (account) {
            userType = "individual";
        } else {
            // If not a user, try to find as organization
            account = await Organization.findById(decoded.id);
            if (account) {
                userType = "Organization";
            }
        }
        
        if (!account || account.refreshToken !== token) {
            return res.status(403).json({ message: 'Invalid refresh token.' });
        }

        // Generate a new access token
        const accessToken = jwt.sign(
            { id: account._id, type: userType, userid: account.userid },
            process.env.ACCESS_TOKEN_SECRET,
            { expiresIn: '1d' }
        );

        // Generate new refresh token
        const newRefreshToken = jwt.sign(
            { id: account._id, type: userType, userid: account.userid },
            process.env.REFRESH_TOKEN_SECRET,
            { expiresIn: '7d' }
        );
        
        account.refreshToken = newRefreshToken;
        await account.save();

        // Set cookies with proper settings
        res.cookie('accessToken', accessToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: process.env.NODE_ENV === 'production' ? "None" : "Lax",
            path: '/',
            maxAge: 1 * 24 * 60 * 60 * 1000 // 1 day
        });
        
        res.cookie('refreshToken', newRefreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: process.env.NODE_ENV === 'production' ? "None" : "Lax",
            path: '/',
            maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
        });
        
        res.cookie('UserId', account.userid, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: process.env.NODE_ENV === 'production' ? "None" : "Lax",
            path: '/',
            maxAge: 1 * 24 * 60 * 60 * 1000 // 1 day
        });
        
        res.cookie('UserType', userType, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: process.env.NODE_ENV === 'production' ? "None" : "Lax",
            path: '/',
            maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
        });

        return res.status(200).json({
            message: 'Token refreshed successfully',
            accessToken,
            refreshToken: newRefreshToken
        });
    } catch (error) {
        console.error('Error refreshing token:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
};

module.exports = { handleRefreshToken }; 