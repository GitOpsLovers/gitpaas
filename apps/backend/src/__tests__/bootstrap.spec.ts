import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import helmet from 'helmet';

import { bootstrap } from '../bootstrap';

import { requestIdMiddleware } from '@core/ui/middlewares/request-id.middleware';
import { UsersService } from '@features/users/ui/services/users.service';

jest.mock('@nestjs/core', () => ({
    NestFactory: {
        create: jest.fn(),
    },
}));

jest.mock('../app.module', () => ({
    AppModule: Symbol('AppModule'),
}));

const HELMET_MIDDLEWARE = Symbol('helmet-middleware');

jest.mock('helmet', () => ({
    __esModule: true,
    default: jest.fn(() => HELMET_MIDDLEWARE),
}));

// eslint-disable-next-line @typescript-eslint/unbound-method
const mockNestFactoryCreate = NestFactory.create as jest.Mock;
const mockHelmet = helmet as unknown as jest.Mock;

/**
 * Builds the `app` stub returned by `NestFactory.create`
 */
function buildApp(env: Record<string, string | undefined>) {
    const config = {
        // eslint-disable-next-line security/detect-object-injection
        get: jest.fn((key: string) => env[key]),
        getOrThrow: jest.fn((key: string) => {
            // eslint-disable-next-line security/detect-object-injection
            const value = env[key];

            if (value === undefined) {
                throw new Error(`Missing config: ${key}`);
            }

            return value;
        }),
    };

    const usersService = {
        seedDevelopmentAdmin: jest.fn().mockResolvedValue(undefined),
    };

    const app = {
        get: jest.fn((token: unknown) => (token === UsersService ? usersService : config)),
        setGlobalPrefix: jest.fn(),
        enableCors: jest.fn(),
        use: jest.fn(),
        useGlobalPipes: jest.fn(),
        enableShutdownHooks: jest.fn(),
        listen: jest.fn().mockResolvedValue(undefined),
    };

    return { app, usersService };
}

describe('bootstrap (bootstrap.ts)', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('application wiring', () => {
        const env = {
            CORS_ORIGIN: 'http://a.com',
            PORT: '3000',
            NODE_ENV: 'production',
        };

        it('creates the Nest app from AppModule', async () => {
            const { app } = buildApp(env);
            mockNestFactoryCreate.mockResolvedValue(app);

            await bootstrap();

            expect(mockNestFactoryCreate).toHaveBeenCalledTimes(1);
        });

        it('sets the global API prefix to api/v1', async () => {
            const { app } = buildApp(env);
            mockNestFactoryCreate.mockResolvedValue(app);

            await bootstrap();

            expect(app.setGlobalPrefix).toHaveBeenCalledTimes(1);
            expect(app.setGlobalPrefix).toHaveBeenCalledWith('api/v1');
        });

        it('enables CORS with the parsed origin allowlist and credentials', async () => {
            const { app } = buildApp(env);
            mockNestFactoryCreate.mockResolvedValue(app);

            await bootstrap();

            expect(app.enableCors).toHaveBeenCalledTimes(1);
            expect(app.enableCors).toHaveBeenCalledWith({
                origin: ['http://a.com'],
                credentials: true,
            });
        });

        it('applies helmet middleware via app.use', async () => {
            const { app } = buildApp(env);
            mockNestFactoryCreate.mockResolvedValue(app);

            await bootstrap();

            expect(mockHelmet).toHaveBeenCalledTimes(1);
            expect(app.use).toHaveBeenCalledWith(HELMET_MIDDLEWARE);
        });

        it('stamps every request with a correlation id before any other middleware', async () => {
            const { app } = buildApp(env);
            mockNestFactoryCreate.mockResolvedValue(app);

            await bootstrap();

            expect(app.use).toHaveBeenCalledTimes(2);
            expect(app.use).toHaveBeenNthCalledWith(1, requestIdMiddleware);
            expect(app.use).toHaveBeenNthCalledWith(2, HELMET_MIDDLEWARE);
        });

        it('registers a global ValidationPipe', async () => {
            const { app } = buildApp(env);
            mockNestFactoryCreate.mockResolvedValue(app);

            await bootstrap();

            expect(app.useGlobalPipes).toHaveBeenCalledTimes(1);

            const pipe = app.useGlobalPipes.mock.calls[0][0];

            expect(pipe).toBeInstanceOf(ValidationPipe);
        });

        it('enables the shutdown hooks before listening', async () => {
            const { app } = buildApp(env);
            mockNestFactoryCreate.mockResolvedValue(app);

            await bootstrap();

            expect(app.enableShutdownHooks).toHaveBeenCalledTimes(1);

            const hooksOrder = app.enableShutdownHooks.mock.invocationCallOrder[0];
            const listenOrder = app.listen.mock.invocationCallOrder[0];

            expect(hooksOrder).toBeLessThan(listenOrder);
        });

        it('listens on the configured PORT', async () => {
            const { app } = buildApp(env);
            mockNestFactoryCreate.mockResolvedValue(app);

            await bootstrap();

            expect(app.listen).toHaveBeenCalledTimes(1);
            expect(app.listen).toHaveBeenCalledWith('3000');
        });
    });

    describe('CORS origin parsing', () => {
        it('trims entries and drops empties from CORS_ORIGIN', async () => {
            const { app } = buildApp({
                CORS_ORIGIN: 'http://a.com, http://b.com ,',
                PORT: '3000',
                NODE_ENV: 'production',
            });
            mockNestFactoryCreate.mockResolvedValue(app);

            await bootstrap();

            expect(app.enableCors).toHaveBeenCalledWith({
                origin: ['http://a.com', 'http://b.com'],
                credentials: true,
            });
        });
    });

    describe('development seed hook', () => {
        it('seeds the development admin exactly once after listen when NODE_ENV is development', async () => {
            const { app, usersService } = buildApp({
                CORS_ORIGIN: 'http://a.com',
                PORT: '3000',
                NODE_ENV: 'development',
            });
            mockNestFactoryCreate.mockResolvedValue(app);

            await bootstrap();

            expect(usersService.seedDevelopmentAdmin).toHaveBeenCalledTimes(1);

            // The seed must run only after the server is listening.
            const listenOrder = app.listen.mock.invocationCallOrder[0];
            const seedOrder = usersService.seedDevelopmentAdmin.mock.invocationCallOrder[0];

            expect(seedOrder).toBeGreaterThan(listenOrder);
        });

        it.each([['production'], ['test'], [undefined]])(
            'does not seed when NODE_ENV is %s, while still wiring up and listening',
            async (nodeEnv) => {
                const { app, usersService } = buildApp({
                    CORS_ORIGIN: 'http://a.com',
                    PORT: '3000',
                    NODE_ENV: nodeEnv,
                });
                mockNestFactoryCreate.mockResolvedValue(app);

                await bootstrap();

                expect(usersService.seedDevelopmentAdmin).not.toHaveBeenCalled();
                expect(app.setGlobalPrefix).toHaveBeenCalledWith('api/v1');
                expect(app.listen).toHaveBeenCalledWith('3000');
            },
        );
    });
});
