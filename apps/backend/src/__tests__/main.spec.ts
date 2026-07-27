import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import helmet from 'helmet';

import { UsersService } from '@features/users/ui/services/users.service';

/**
 * Unit tests for `main.ts`'s `bootstrap()`.
 *
 * The heavy Nest bootstrap machinery is mocked at its module boundary so no real
 * HTTP server, DI container, or database work runs:
 *  - `@nestjs/core` → `NestFactory.create` resolves to a hand-rolled `app` stub.
 *  - `./app.module` → `AppModule` is a stub token (never actually instantiated).
 *  - `helmet` → a jest mock returning a sentinel middleware we can identify.
 *
 * `main` is imported through `jest.isolateModules` on a fresh module registry per
 * case, because `bootstrap()` runs as a side effect at import time.
 */

jest.mock('@nestjs/core', () => ({
    NestFactory: {
        create: jest.fn(),
    },
}));

jest.mock('../app.module', () => ({
    AppModule: class AppModule {},
}));

const HELMET_MIDDLEWARE = Symbol('helmet-middleware');

jest.mock('helmet', () => ({
    __esModule: true,
    default: jest.fn(() => HELMET_MIDDLEWARE),
}));

const mockNestFactoryCreate = NestFactory.create as jest.Mock;
const mockHelmet = helmet as unknown as jest.Mock;

/**
 * Builds the `app` stub returned by `NestFactory.create`, wiring a `ConfigService`
 * double driven by the given env map and a `UsersService` stub whose
 * `seedDevelopmentAdmin` is a jest mock.
 */
function buildApp(env: Record<string, string | undefined>) {
    const config = {
        get: jest.fn((key: string) => env[key]),
        getOrThrow: jest.fn((key: string) => {
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
        get: jest.fn((token: unknown) => {
            // `main` is loaded on an isolated module registry, so the `UsersService`
            // token it passes is a distinct class object from the one imported here.
            // Match by class name, which survives the registry reset.
            if (typeof token === 'function' && token.name === UsersService.name) {
                return usersService;
            }

            return config;
        }),
        setGlobalPrefix: jest.fn(),
        enableCors: jest.fn(),
        use: jest.fn(),
        useGlobalPipes: jest.fn(),
        listen: jest.fn().mockResolvedValue(undefined),
    };

    return { app, config, usersService };
}

/**
 * Imports `main` on a fresh module registry, triggering `bootstrap()`, and waits
 * for any pending microtasks so the floating `bootstrap()` promise settles.
 */
async function runBootstrap() {
    jest.isolateModules(() => {
        require('../main');
    });

    // Let the floating `bootstrap()` promise (and its awaited chain) settle.
    await new Promise((resolve) => setImmediate(resolve));
}

describe('bootstrap (main.ts)', () => {
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

            await runBootstrap();

            expect(mockNestFactoryCreate).toHaveBeenCalledTimes(1);
        });

        it('sets the global API prefix to api/v1', async () => {
            const { app } = buildApp(env);
            mockNestFactoryCreate.mockResolvedValue(app);

            await runBootstrap();

            expect(app.setGlobalPrefix).toHaveBeenCalledTimes(1);
            expect(app.setGlobalPrefix).toHaveBeenCalledWith('api/v1');
        });

        it('enables CORS with the parsed origin allowlist and credentials', async () => {
            const { app } = buildApp(env);
            mockNestFactoryCreate.mockResolvedValue(app);

            await runBootstrap();

            expect(app.enableCors).toHaveBeenCalledTimes(1);
            expect(app.enableCors).toHaveBeenCalledWith({
                origin: ['http://a.com'],
                credentials: true,
            });
        });

        it('applies helmet middleware via app.use', async () => {
            const { app } = buildApp(env);
            mockNestFactoryCreate.mockResolvedValue(app);

            await runBootstrap();

            expect(mockHelmet).toHaveBeenCalledTimes(1);
            expect(app.use).toHaveBeenCalledTimes(1);
            expect(app.use).toHaveBeenCalledWith(HELMET_MIDDLEWARE);
        });

        it('registers a global ValidationPipe', async () => {
            const { app } = buildApp(env);
            mockNestFactoryCreate.mockResolvedValue(app);

            await runBootstrap();

            expect(app.useGlobalPipes).toHaveBeenCalledTimes(1);

            // Loaded on an isolated registry, so match the pipe by constructor name
            // rather than an `instanceof` against this file's `ValidationPipe` copy.
            const pipe = app.useGlobalPipes.mock.calls[0][0];

            expect(pipe.constructor.name).toBe(ValidationPipe.name);
        });

        it('listens on the configured PORT', async () => {
            const { app } = buildApp(env);
            mockNestFactoryCreate.mockResolvedValue(app);

            await runBootstrap();

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

            await runBootstrap();

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

            await runBootstrap();

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

                await runBootstrap();

                expect(usersService.seedDevelopmentAdmin).not.toHaveBeenCalled();
                expect(app.setGlobalPrefix).toHaveBeenCalledWith('api/v1');
                expect(app.listen).toHaveBeenCalledWith('3000');
            },
        );
    });
});
