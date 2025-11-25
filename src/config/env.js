// src/config/env.js
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({
    path: path.resolve(process.cwd(), '.env'),
});

const env = {
    appName: process.env.APP_NAME || 'JauPesca Gateway',
    env: process.env.APP_ENV || process.env.NODE_ENV || 'development',
    port: Number(process.env.APP_PORT || 15432),
};

module.exports = { env };