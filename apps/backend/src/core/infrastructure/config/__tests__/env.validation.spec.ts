import 'reflect-metadata';

import { validate } from '../env.validation';

describe('validate', () => {
    it('accepts an empty environment and defaults NODE_ENV to development', () => {
        const result = validate({});

        expect(result.NODE_ENV).toBe('development');
    });

    it('coerces numeric ports to numbers', () => {
        const result = validate({ PORT: '4000', DB_PORT: '5432', REDIS_PORT: '6379', VPS_DOCKER_PORT: '2376' });

        expect(result.PORT).toBe(4000);
        expect(result.DB_PORT).toBe(5432);
        expect(result.REDIS_PORT).toBe(6379);
        expect(result.VPS_DOCKER_PORT).toBe(2376);
    });

    it('rejects a non-numeric port', () => {
        expect(() => validate({ PORT: 'not-a-number' })).toThrow(/Invalid environment configuration/);
    });

    it('rejects an unknown NODE_ENV', () => {
        expect(() => validate({ NODE_ENV: 'staging' })).toThrow(/Invalid environment configuration/);
    });

    it('accepts the production environment', () => {
        expect(validate({ NODE_ENV: 'production' }).NODE_ENV).toBe('production');
    });

    it('ignores unrelated environment variables', () => {
        expect(() => validate({ PATH: '/usr/bin', HOME: '/root' })).not.toThrow();
    });
});
