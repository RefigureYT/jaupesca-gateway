// src/project/index.js
const fs = require('fs');
const path = require('path');
const { env } = require('../config/env');

function registerProjects(app) {
    const projectsDir = __dirname;

    const entries = fs.readdirSync(projectsDir, { withFileTypes: true });

    entries.forEach((entry) => {
        if (!entry.isDirectory()) return;

        const projectName = entry.name;
        const projectIndexPath = path.join(projectsDir, projectName, 'index.js');

        if (!fs.existsSync(projectIndexPath)) {
            console.warn(
                `[Gateway] Pasta de projeto "${projectName}" ignorada (sem index.js).`
            );
            return;
        }

        // eslint-disable-next-line global-require, import/no-dynamic-require
        const projectModule = require(projectIndexPath);

        const mountPath =
            typeof projectModule.mountPath === 'string'
                ? projectModule.mountPath
                : `/${projectName}`;

        const router = projectModule.router;

        if (!router || typeof router !== 'function') {
            console.warn(
                `[Gateway] Projeto "${projectName}" encontrado, mas não exporta um router válido. ` +
                'Esperado: module.exports = { mountPath, router }'
            );
            return;
        }

        app.use(mountPath, router);

        if (env.env !== 'test') {
            console.log(
                `[Gateway] Projeto "${projectName}" montado em "${mountPath}"`
            );
        }
    });
}

module.exports = { registerProjects };
