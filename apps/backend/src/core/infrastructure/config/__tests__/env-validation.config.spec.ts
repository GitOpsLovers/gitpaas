/* eslint-disable no-secrets/no-secrets */
import { validate } from '../env-validation.config';

/** A complete, valid environment covering every mandatory variable. */
const validEnv = (): Record<string, unknown> => ({
    NODE_ENV: 'development',
    PORT: '4000',
    DB_HOST: 'localhost',
    DB_PORT: '5432',
    DB_USER: 'gitpaas',
    DB_PASSWORD: 'secret',
    DB_NAME: 'gitpaas_db',
    REDIS_HOST: 'localhost',
    REDIS_PORT: '6379',
    PROVIDERS_ENCRYPTION_KEY: '0123456789abcdef0123456789abcdef',
    CORS_ORIGIN: 'http://localhost:4200',
    APP_BASE_URL: 'http://localhost:4200',
    THROTTLE_TTL: '60000',
    THROTTLE_LIMIT: '100',
    THROTTLE_STREAM_TTL: '60000',
    THROTTLE_STREAM_LIMIT: '1000',
    LOGS_MAX_LINES: '5000',
    JWT_ACCESS_SECRET: 'access-secret',
    JWT_ACCESS_EXPIRES_IN: '15m',
    JWT_REFRESH_SECRET: 'refresh-secret',
    JWT_REFRESH_EXPIRES_IN: '7d',
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
        delete env.DB_USER;
        delete env.CORS_ORIGIN;

        let message = '';

        try {
            validate(env);
        } catch (error) {
            message = (error as Error).message;
        }

        expect(message).toContain('Invalid environment configuration');
        expect(message).toContain('DB_HOST');
        expect(message).toContain('DB_USER');
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

    it('fails fast when the database name is missing', () => {
        const env = validEnv();
        delete env.DB_NAME;

        expect(() => validate(env)).toThrow(/DB_NAME/);
    });

    it('fails fast when the access token secret is missing', () => {
        const env = validEnv();
        delete env.JWT_ACCESS_SECRET;

        expect(() => validate(env)).toThrow(/JWT_ACCESS_SECRET/);
    });

    it('fails fast when the access token expiry is missing', () => {
        const env = validEnv();
        delete env.JWT_ACCESS_EXPIRES_IN;

        expect(() => validate(env)).toThrow(/JWT_ACCESS_EXPIRES_IN/);
    });

    it('fails fast when the refresh token secret is missing', () => {
        const env = validEnv();
        delete env.JWT_REFRESH_SECRET;

        expect(() => validate(env)).toThrow(/JWT_REFRESH_SECRET/);
    });

    it('fails fast when the refresh token expiry is missing', () => {
        const env = validEnv();
        delete env.JWT_REFRESH_EXPIRES_IN;

        expect(() => validate(env)).toThrow(/JWT_REFRESH_EXPIRES_IN/);
    });

    it('coerces numeric ports to numbers', () => {
        const result = validate(validEnv());

        expect(result.PORT).toBe(4000);
        expect(result.DB_PORT).toBe(5432);
    });

    it('coerces the throttler settings to numbers', () => {
        const result = validate(validEnv());

        expect(result.THROTTLE_TTL).toBe(60000);
        expect(result.THROTTLE_LIMIT).toBe(100);
        expect(result.THROTTLE_STREAM_TTL).toBe(60000);
        expect(result.THROTTLE_STREAM_LIMIT).toBe(1000);
    });

    it('coerces the log settings to numbers', () => {
        const result = validate(validEnv());

        expect(result.LOGS_MAX_LINES).toBe(5000);
    });

    it('fails fast when a log variable is missing', () => {
        const env = validEnv();
        delete env.LOGS_MAX_LINES;

        expect(() => validate(env)).toThrow(/LOGS_MAX_LINES/);
    });

    it('falls back to the default telemetry sampling settings when none are given', () => {
        const result = validate(validEnv());

        expect(result.TELEMETRY_SLOW_MS).toBe(1000);
        expect(result.TELEMETRY_SAMPLE_RATE).toBe(0.05);
    });

    it('coerces the telemetry sampling settings to numbers', () => {
        const result = validate({
            ...validEnv(),
            TELEMETRY_SLOW_MS: '2500',
            TELEMETRY_SAMPLE_RATE: '0.5',
        });

        expect(result.TELEMETRY_SLOW_MS).toBe(2500);
        expect(result.TELEMETRY_SAMPLE_RATE).toBe(0.5);
    });

    it('rejects a sample rate outside the zero-to-one range', () => {
        expect(() => validate({ ...validEnv(), TELEMETRY_SAMPLE_RATE: '1.5' })).toThrow(
            /TELEMETRY_SAMPLE_RATE/,
        );
        expect(() => validate({ ...validEnv(), TELEMETRY_SAMPLE_RATE: '-0.1' })).toThrow(
            /TELEMETRY_SAMPLE_RATE/,
        );
    });

    it('accepts the sample rates right on the ends of the range', () => {
        expect(validate({ ...validEnv(), TELEMETRY_SAMPLE_RATE: '0' }).TELEMETRY_SAMPLE_RATE).toBe(0);
        expect(validate({ ...validEnv(), TELEMETRY_SAMPLE_RATE: '1' }).TELEMETRY_SAMPLE_RATE).toBe(1);
    });

    it('rejects a non-numeric slow threshold', () => {
        expect(() => validate({ ...validEnv(), TELEMETRY_SLOW_MS: 'not-a-number' })).toThrow(
            /TELEMETRY_SLOW_MS/,
        );
    });

    it('coerces the Redis port to a number', () => {
        expect(validate(validEnv()).REDIS_PORT).toBe(6379);
    });

    it('fails fast when a Redis connection variable is missing', () => {
        const env = validEnv();
        delete env.REDIS_HOST;

        expect(() => validate(env)).toThrow(/REDIS_HOST/);
    });

    it('accepts an absent Redis password, since the server may need none', () => {
        expect(() => validate(validEnv())).not.toThrow();
        expect(validate(validEnv()).REDIS_PASSWORD).toBeUndefined();
    });

    it('keeps a configured Redis password', () => {
        expect(validate({ ...validEnv(), REDIS_PASSWORD: 'secret' }).REDIS_PASSWORD).toBe('secret');
    });

    it('fails fast when the providers encryption key is missing', () => {
        const env = validEnv();
        delete env.PROVIDERS_ENCRYPTION_KEY;

        expect(() => validate(env)).toThrow(/PROVIDERS_ENCRYPTION_KEY/);
    });

    it('rejects an empty providers encryption key', () => {
        expect(() => validate({ ...validEnv(), PROVIDERS_ENCRYPTION_KEY: '' }))
            .toThrow(/PROVIDERS_ENCRYPTION_KEY/);
    });

    it('keeps the configured providers encryption key', () => {
        expect(validate(validEnv()).PROVIDERS_ENCRYPTION_KEY)
            .toBe('0123456789abcdef0123456789abcdef');
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

    it('fails fast when the base address of the application is missing', () => {
        const env = validEnv();
        delete env.APP_BASE_URL;

        expect(() => validate(env)).toThrow(/APP_BASE_URL/);
    });

    it('rejects a base address of the application that is not a URL', () => {
        expect(() => validate({ ...validEnv(), APP_BASE_URL: 'not-a-url' }))
            .toThrow(/APP_BASE_URL/);
    });

    it('keeps the configured base address of the application', () => {
        expect(validate({ ...validEnv(), APP_BASE_URL: 'https://gitpaas.example.com' }).APP_BASE_URL)
            .toBe('https://gitpaas.example.com');
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

    it('names the offending variable in the aggregated error', () => {
        expect(() => validate({ ...validEnv(), DB_PORT: 'not-a-number' }))
            .toThrow(/Invalid environment configuration: DB_PORT/);
    });

    it('rejects a base address that carries no protocol of the web', () => {
        expect(() => validate({ ...validEnv(), APP_BASE_URL: 'ftp://files.example.com' }))
            .toThrow(/APP_BASE_URL/);
    });

    describe('local Docker daemon', () => {
        it('validates with no Docker variables present at all', () => {
            const env = validEnv();

            expect(Object.keys(env).some((key) => key.includes('DOCKER'))).toBe(false);
            expect(() => validate(env)).not.toThrow();
        });

        it('does not require the removed remote-daemon variables', () => {
            const result = validate(validEnv());

            expect(result).not.toHaveProperty('SERVER_DOCKER_HOST');
            expect(result).not.toHaveProperty('SERVER_DOCKER_PORT');
            expect(result).not.toHaveProperty('SERVER_DOCKER_CERT_PATH');
        });

        it('reports no Docker variable in the aggregated error for an empty environment', () => {
            let message = '';

            try {
                validate({});
            } catch (error) {
                message = (error as Error).message;
            }

            expect(message).toContain('Invalid environment configuration');
            expect(message).not.toContain('DOCKER');
        });

        it('tolerates leftover remote-daemon variables as unknown keys', () => {
            const env = {
                ...validEnv(),
                SERVER_DOCKER_HOST: '10.0.0.7',
                SERVER_DOCKER_PORT: 'not-a-port',
                SERVER_DOCKER_CERT_PATH: '/certs',
            };

            // They are no longer part of the schema, so even a nonsense value cannot
            // break the boot; the schema simply drops them.
            expect(() => validate(env)).not.toThrow();
            expect(validate(env)).not.toHaveProperty('SERVER_DOCKER_HOST');
        });
    });
});
