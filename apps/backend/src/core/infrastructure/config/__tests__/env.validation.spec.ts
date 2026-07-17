// eslint-disable-next-line import/no-unassigned-import
import 'reflect-metadata';

import { validate } from '../env.validation';

/** A complete, valid environment covering every mandatory variable. */
const validEnv = (): Record<string, unknown> => ({
    NODE_ENV: 'development',
    PORT: '4000',
    DB_HOST: 'localhost',
    DB_PORT: '5432',
    DB_USER: 'artifactory',
    DB_PASSWORD: 'secret',
    DB_NAME: 'artifactory',
    REDIS_HOST: 'localhost',
    REDIS_PORT: '6379',
    GITHUB_APP_ID: '123',
    GITHUB_APP_PRIVATE_KEY: 'key',
    GITHUB_APP_INSTALLATION_ID: '456',
    VPS_DOCKER_HOST: '127.0.0.1',
    VPS_DOCKER_PORT: '2376',
    VPS_DOCKER_CERT_PATH: '/certs',
    CORS_ORIGIN: 'http://localhost:4200',
    THROTTLE_TTL: '60000',
    THROTTLE_LIMIT: '100',
    THROTTLE_STREAM_TTL: '60000',
    THROTTLE_STREAM_LIMIT: '1000',
});

describe('validate', () => {
    it('accepts a fully-populated environment', () => {
        expect(() => validate(validEnv())).not.toThrow();
    });

    it('fails fast when the environment is empty', () => {
        expect(() => validate({})).toThrow(/Invalid environment configuration/);
    });

    it('reports every missing variable in the aggregated error', () => {
        expect(() => validate({})).toThrow(/NODE_ENV/);
        expect(() => validate({})).toThrow(/DB_PASSWORD/);
        expect(() => validate({})).toThrow(/THROTTLE_STREAM_LIMIT/);
    });

    it('aggregates several missing variables into a single error message', () => {
        const env = validEnv();
        delete env.DB_HOST;
        delete env.REDIS_HOST;
        delete env.CORS_ORIGIN;

        let message = '';

        try {
            validate(env);
        } catch (error) {
            message = (error as Error).message;
        }

        expect(message).toContain('Invalid environment configuration');
        expect(message).toContain('DB_HOST');
        expect(message).toContain('REDIS_HOST');
        expect(message).toContain('CORS_ORIGIN');
    });

    it('fails fast when a single required variable is missing', () => {
        const env = validEnv();
        delete env.DB_PASSWORD;

        expect(() => validate(env)).toThrow(/DB_PASSWORD/);
    });

    it('rejects an empty string for a required string variable', () => {
        expect(() => validate({ ...validEnv(), DB_HOST: '' })).toThrow(/DB_HOST/);
    });

    it('coerces numeric ports to numbers', () => {
        const result = validate(validEnv());

        expect(result.PORT).toBe(4000);
        expect(result.DB_PORT).toBe(5432);
        expect(result.REDIS_PORT).toBe(6379);
        expect(result.VPS_DOCKER_PORT).toBe(2376);
    });

    it('coerces the throttler settings to numbers', () => {
        const result = validate(validEnv());

        expect(result.THROTTLE_TTL).toBe(60000);
        expect(result.THROTTLE_LIMIT).toBe(100);
        expect(result.THROTTLE_STREAM_TTL).toBe(60000);
        expect(result.THROTTLE_STREAM_LIMIT).toBe(1000);
    });

    it('rejects a non-numeric throttle limit', () => {
        expect(() => validate({ ...validEnv(), THROTTLE_LIMIT: 'not-a-number' }))
            .toThrow(/Invalid environment configuration/);
    });

    it('accepts a comma-separated CORS origin allowlist', () => {
        const result = validate({
            ...validEnv(),
            CORS_ORIGIN: 'http://localhost:4200,https://app.example.com',
        });

        expect(result.CORS_ORIGIN).toBe('http://localhost:4200,https://app.example.com');
    });

    it('rejects a non-numeric port', () => {
        expect(() => validate({ ...validEnv(), PORT: 'not-a-number' }))
            .toThrow(/Invalid environment configuration/);
    });

    it('rejects an unknown NODE_ENV', () => {
        expect(() => validate({ ...validEnv(), NODE_ENV: 'staging' }))
            .toThrow(/Invalid environment configuration/);
    });

    it('accepts the production environment', () => {
        expect(validate({ ...validEnv(), NODE_ENV: 'production' }).NODE_ENV).toBe('production');
    });

    it('ignores unrelated environment variables', () => {
        expect(() => validate({ ...validEnv(), PATH: '/usr/bin', HOME: '/root' })).not.toThrow();
    });
});
