const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Organization = require('../models/Organizations');

router.get('/refresh', async (req, res) => {
    // Get the refresh token from cookie
    const refreshToken = req.cookies.refreshToken;
    
    // If no refresh token, return unauthorized
    if (!refreshToken) {
        return res.status(401).json({ message: 'Unauthorized - No refresh token' });
    }
    
    try {
        // Verify the refresh token
        const decoded = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET);
        
        // Check if the user/org with this token exists
        let account;
        let userType;
        
        if (decoded.isOrganization) {
            account = await Organization.findById(decoded.id);
            userType = "Organization";
        } else {
            account = await User.findById(decoded.id);
            userType = "individual";
        }
        
        // If account not found or refresh token doesn't match
        if (!account || account.refreshToken !== refreshToken) {
            return res.status(403).json({ message: 'Forbidden - Invalid refresh token' });
        }
        
        // Generate new tokens
        const accessToken = jwt.sign(
            { id: account._id, type: userType, userid: account.userid },
            process.env.ACCESS_TOKEN_SECRET,
            { expiresIn: '1d' }
        );
        
        const newRefreshToken = jwt.sign(
            { id: account._id, type: userType, userid: account.userid },
            process.env.REFRESH_TOKEN_SECRET,
            { expiresIn: '7d' }
        );
        
        // Update the refresh token in the database
        account.refreshToken = newRefreshToken;
        await account.save();
        
        // Set the new tokens as cookies
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
        
        // Send success response with new tokens
        return res.status(200).json({
            message: 'Token refresh successful',
            accessToken,
            refreshToken: newRefreshToken
        });
        
    } catch (error) {
        console.error('Error refreshing token:', error);
        return res.status(403).json({ message: 'Forbidden - Invalid refresh token' });
    }
});

module.exports = router; 