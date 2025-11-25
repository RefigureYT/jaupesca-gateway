// src/routes/index.js
const express = require('express');
const { healthRouter } = require('./health.routes');

// --------- IMPORTS DAS ROTAS TS DE REMARKETING ---------
// remarketing-config.routes.ts (GET/POST /api/remarketing/config, etc.)
const remarketingConfigModule = require('./remarketing/remarketing-config.routes');
const remarketingConfigRouter =
    remarketingConfigModule.default || remarketingConfigModule;

// upload-remarketing.ts (POST /api/remarketing/upload)
// OBS: estamos em src/routes, então precisamos subir um nível para chegar em src/services
const uploadRemarketingModule = require('../services/remarketing/upload-remarketing');
const uploadRemarketingRouter =
    uploadRemarketingModule.default || uploadRemarketingModule;
// --------------------------------------------------------

const router = express.Router();

// Rota de health
router.use(healthRouter);

// Rotas de API: remarketing (config + upload)
router.use(remarketingConfigRouter);
router.use(uploadRemarketingRouter);

// Rota raiz "/" [Redireciona para /home]
router.get('/', (req, res) => {
    res.redirect('/home');
});

module.exports = { router };
