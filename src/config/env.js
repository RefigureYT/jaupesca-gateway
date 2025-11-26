// src/config/env.js
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({
    path: path.resolve(process.cwd(), '.env'),
});

const env = {
    appName: process.env.APP_NAME || '[PROJECT NONAME]',
    env: process.env.APP_ENV || process.env.NODE_ENV || 'development',
    port: Number(process.env.APP_PORT || 15432),
    ip: process.env.APP_IP || '0.0.0.0',

    // MINIO (S3 Jaú Pesca)
    minioEndpoint: process.env.MINIO_ENDPOINT || 'NOT-SET',
    minioRegion: process.env.MINIO_REGION || 'us-east-1',
    minioAccessKey: process.env.MINIO_ACCESS_KEY || 'NOT-SET',
    minioSecretKey: process.env.MINIO_SECRET_KEY || 'NOT-SET',
    minioBucketRemarketing: process.env.MINIO_BUCKET_REMARKETING || 'NOT-SET',
    minioPublicBaseUrl: process.env.MINIO_PUBLIC_BASE_URL || 'NOT-SET',

    // DATABASE PRINCIPAL (PostgreSQL)
    dbHost: process.env.DB_HOST || 'NOT-SET',
    dbPort: process.env.DB_PORT || 'NOT-SET',
    dbUser: process.env.DB_USER || 'NOT-SET',
    dbPassword: process.env.DB_PASSWORD || 'NOT-SET',
    dbDatabase: process.env.DB_DATABASE || 'NOT-SET',
    dbSSL: process.env.DB_SSL === 'true' || false,
};

// Verifica se alguma das variáveis está faltando (Considerando o "NOT-SET")
const missingVars = Object.entries(env)
    .filter(([_, value]) => value === 'NOT-SET')
    .map(([key, _]) => key);
    
if (missingVars.length > 0) {
    console.warn(
        `Warning: Missing environment variables for: ${missingVars.join(', ')}`
    );
    process.exit(1); // ! FINALIZA COM ERRO !
}
module.exports = { env };