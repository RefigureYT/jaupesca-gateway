// src/config/app.js
const express = require('express');
const { router: baseRouter } = require('../routes');
const { registerProjects } = require('../project');

function createApp() {
    const app = express();

    // Middlewares globais
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));

    // Rotas "fixas" (home, health, etc.)
    app.use('/', baseRouter);

    // Projetos dinâmicos (auto-descobertos em src/project/*)
    registerProjects(app);

    return app;
}

module.exports = { createApp };