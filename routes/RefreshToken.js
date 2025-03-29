const express = require('express');
const router = express.Router();
const { handleRefreshToken } = require('../Controllers/authentication/RefreshToken');

router.post('/refresh', handleRefreshToken);

module.exports = router;
