// src/project/remarketing/index.js
const express = require('express');
const path = require('path');

const router = express.Router();

// Caminho absoluto para a pasta "public" deste projeto
const publicPath = path.join(__dirname, 'public');

// Middleware para servir arquivos estáticos da pasta "public"
router.use('/public', express.static(publicPath));

// GET /remarketing/ [Responde com remarketing.html]
router.get('/', (req, res) => {
  res.sendFile('/templates/remarketing.html', { root: publicPath});
});

// GET /remarketing/config [Responde com remarketing-config.html]
router.get('/config', (req, res) => {
  res.sendFile('/templates/remarketing-config.html', { root: publicPath});
});

module.exports = {
  mountPath: '/remarketing', // se você não colocar isso, ele usaria "/remarketing" pelo nome da pasta
  router,
};
