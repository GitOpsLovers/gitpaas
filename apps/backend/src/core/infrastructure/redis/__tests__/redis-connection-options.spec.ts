import { buildRedisConnectionOptions } from '../redis-connection-options';

describe('buildRedisConnectionOptions', () => {
    const environment = process.env;

    beforeEach(() => {
        jest.clearAllMocks();
        process.env = { ...environment };
    });

    afterEach(() => {
        process.env = environment;
    });

    it('reads the host and the port from the environment', () => {
        process.env.REDIS_HOST = 'redis';
        process.env.REDIS_PORT = '6379';

        expect(buildRedisConnectionOptions()).toEqual({ host: 'redis', port: 6379 });
    });

    it('adds the password only when one is configured', () => {
        process.env.REDIS_HOST = 'redis';
        process.env.REDIS_PORT = '6379';
        process.env.REDIS_PASSWORD = 'secret';

        expect(buildRedisConnectionOptions()).toEqual({ host: 'redis', port: 6379, password: 'secret' });
    });

    it('omits an empty password, so an unauthenticated server is not sent one', () => {
        process.env.REDIS_HOST = 'redis';
        process.env.REDIS_PORT = '6379';
        process.env.REDIS_PASSWORD = '';

        expect(buildRedisConnectionOptions()).not.toHaveProperty('password');
    });
});
