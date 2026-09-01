/**
 * Jest global setup file.
 *
 * Some specs import Nest modules (`CoreModule`, `AppModule`, ...) whose decorator metadata calls
 * `ConfigModule.forRoot({ validate })` at import time. That validation runs against `process.env`,
 * so a worker whose environment lacks the required variables dies with an uncaught error before a
 * single test executes. Developer machines hide the problem because `apps/backend/.env` is present
 * and `ConfigModule` loads it; CI runners have no `.env`, so the suite crashes there.
 *
 * This file seeds safe, inert placeholders for every variable the validation demands, before any
 * module is loaded. Values already present in the environment always win, so a spec (or a local
 * `.env`) can still override any of them.
 */

const PLACEHOLDER_ENV: Record<string, string> = {
    NODE_ENV: 'test',
    PORT: '3000',

    DB_HOST: 'localhost',
    DB_PORT: '5432',
    DB_USER: 'test-user',
    DB_PASSWORD: 'test-password',
    DB_NAME: 'test-db',

    REDIS_HOST: 'localhost',
    REDIS_PORT: '6379',

    SECRETS_ENCRYPTION_KEY: '0'.repeat(64),

    CORS_ORIGIN: 'http://localhost:4200',
    APP_BASE_URL: 'http://localhost:4200',

    THROTTLE_TTL: '60000',
    THROTTLE_LIMIT: '100',
    THROTTLE_STREAM_TTL: '60000',
    THROTTLE_STREAM_LIMIT: '10',

    LOGS_MAX_LINES: '1000',
    RUNTIME_LOGS_RETENTION_DAYS: '7',

    JWT_ACCESS_SECRET: 'test-access-secret',
    JWT_ACCESS_EXPIRES_IN: '15m',
    JWT_REFRESH_SECRET: 'test-refresh-secret',
    JWT_REFRESH_EXPIRES_IN: '7d',
    JWT_2FA_SECRET: 'test-2fa-secret',
};

for (const [key, value] of Object.entries(PLACEHOLDER_ENV)) {
    // eslint-disable-next-line security/detect-object-injection
    if (process.env[key] === undefined || process.env[key] === '') {
        // eslint-disable-next-line security/detect-object-injection
        process.env[key] = value;
    }
}
