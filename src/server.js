// src/server.js
const { createApp } = require('./config/app');
const { env } = require('./config/env');

const app = createApp();

app.listen(env.port, env.ip, () => {
    console.log(
        `[Gateway] ${env.appName} rodando em ambiente "${env.env}" na porta ${env.port}`
    );
});
