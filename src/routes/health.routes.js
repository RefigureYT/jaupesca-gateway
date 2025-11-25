// src/routes/health.routes.js
const express = require('express');

const router = express.Router();

router.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        service: 'JauPesca Gateway',
        timestamp: new Date().toISOString(),
    });
});

module.exports = { healthRouter: router };