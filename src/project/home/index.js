// src/project/home/index.js
const express = require('express');
const path = require('path');

const router = express.Router();

// Caminho absoluto da pasta "public" deste projeto
const publicPath = path.join(__dirname, 'public');


// Middleware para servir arquivos estáticos da pasta "public"
router.use('/public', express.static(publicPath));

// GET /home/ [Responde com o home.html]
router.get('/', (req, res) => {
    res.sendFile('home.html', { root: publicPath });
});


module.exports = {
    mountPath: '/home', // se você não colocar isso, ele usaria "/home" pelo nome da pasta
    router,
};