// src/routes/index.js
const express = require('express');
const { healthRouter } = require('./health.routes');

const router = express.Router();

// Rota de health
router.use(healthRouter);

// Home simples (depois você pode substituir por HTML bonitão)
router.get('/', (req, res) => {
    res.json({
        name: 'JauPesca Gateway',
        message: 'Ponto de entrada unificado de serviços da Jaú Pesca.',
        health: '/health',
        // futuramente você pode listar aqui os projetos detectados
    });
});

module.exports = { router };