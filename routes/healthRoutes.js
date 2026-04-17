const healthCheck = require('../controllers/healthCheck');
const express = require('express');
const router = express.Router();

router.get('/health', healthCheck);

module.exports = router;