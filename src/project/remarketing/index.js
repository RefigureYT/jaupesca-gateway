// src/project/remarketing/index.js
const express = require('express');

const router = express.Router();

// GET /remarketing/
router.get('/', (req, res) => {
  res.json({
    project: 'remarketing',
    status: 'ok',
  });
});

module.exports = {
  mountPath: '/remarketing', // se você não colocar isso, ele usaria "/remarketing" pelo nome da pasta
  router,
};
