import { NestFactory } from '@nestjs/core';

/**
 * `seed-admin.cli.ts` is a one-shot CLI entrypoint: it has no exported unit, and
 * its top-level `run().then(exit(0)).catch(exit(1))` runs on import. Each test
 * therefore re-imports the module in an isolated registry (`isolateModules`) with
 * env + collaborators mocked, and resolves the exit code the floating promise
 * chain hands to a stubbed `process.exit`.
 *
 * Collaborators are mocked at their real module boundaries:
 *  - `@nestjs/core.NestFactory.createApplicationContext` → returns a stub context
 *    whose `get(UsersService)` yields a stub with a mocked `seedAdmin`, and whose
 *    `close()` is a mock — so no real Nest app boots and no Postgres is touched.
 *  - `./seed-admin-cli.module` → stubbed so the real Core/Users module graph is
 *    never loaded on import.
 */

const mockSeedAdmin = jest.fn<Promise<void>, [{ email: string; password: string }]>();
const mockClose = jest.fn<Promise<void>, []>();
const mockGet = jest.fn();
const mockContext = {
    get: mockGet,
    close: mockClose,
};

jest.mock('@nestjs/core', () => ({
    NestFactory: {
        createApplicationContext: jest.fn(),
    },
}));

jest.mock('../seed-admin-cli.module', () => ({
    SeedAdminCliModule: class SeedAdminCliModule {},
}));

const mockCreateApplicationContext = NestFactory.createApplicationContext as jest.Mock;

/**
 * Imports `seed-admin.cli` in a fresh module registry and resolves with the exit
 * code its floating `then/catch` chain passes to a stubbed `process.exit`.
 */
const invokeSeedAdmin = async (): Promise<number> => {
    const exited = new Promise<number>((resolve) => {
        jest.spyOn(process, 'exit').mockImplementation(((code?: number): never => {
            resolve(code ?? 0);
            return undefined as never;
        }) as (code?: number) => never);
    });

    jest.isolateModules(() => {
        require('../seed-admin.cli');
    });

    return exited;
};

describe('seed-admin.cli', () => {
    let envBackup: NodeJS.ProcessEnv;

    beforeEach(() => {
        jest.clearAllMocks();

        envBackup = { ...process.env };
        process.env.ADMIN_EMAIL = 'admin@gitpaas.io';
        process.env.ADMIN_PASSWORD = 'super-secret-pw';

        mockSeedAdmin.mockResolvedValue(undefined);
        mockClose.mockResolvedValue(undefined);
        // `isolateModules` re-requires the CLI (and its `UsersService` token) in a
        // fresh registry, so its class identity differs from the one imported here;
        // the context stub therefore yields the seeder stub for whatever token the
        // CLI resolves.
        mockGet.mockReturnValue({ seedAdmin: mockSeedAdmin });
        mockCreateApplicationContext.mockResolvedValue(mockContext);

        jest.spyOn(console, 'log').mockImplementation(() => undefined);
        jest.spyOn(console, 'error').mockImplementation(() => undefined);
    });

    afterEach(() => {
        process.env = envBackup;
        jest.restoreAllMocks();
    });

    describe('happy path — seeds through UsersService', () => {
        it('bootstraps a Nest context and resolves the seeder service', async () => {
            await invokeSeedAdmin();

            expect(mockCreateApplicationContext).toHaveBeenCalledTimes(1);
            expect(mockGet).toHaveBeenCalledTimes(1);
        });

        it('delegates to seedAdmin with the trimmed email and password, then exits 0', async () => {
            const code = await invokeSeedAdmin();

            expect(code).toBe(0);
            expect(mockSeedAdmin).toHaveBeenCalledTimes(1);
            expect(mockSeedAdmin).toHaveBeenCalledWith({
                email: 'admin@gitpaas.io',
                password: 'super-secret-pw',
            });
        });

        it('trims surrounding whitespace off the email', async () => {
            process.env.ADMIN_EMAIL = '  admin@gitpaas.io  ';

            await invokeSeedAdmin();

            expect(mockSeedAdmin).toHaveBeenCalledWith({
                email: 'admin@gitpaas.io',
                password: 'super-secret-pw',
            });
        });

        it('always closes the context', async () => {
            await invokeSeedAdmin();

            expect(mockClose).toHaveBeenCalledTimes(1);
        });
    });

    describe('missing / empty env vars — fails without bootstrapping', () => {
        it.each([
            ['ADMIN_EMAIL is undefined', () => delete process.env.ADMIN_EMAIL, 'ADMIN_EMAIL is required'],
            ['ADMIN_EMAIL is empty', () => (process.env.ADMIN_EMAIL = ''), 'ADMIN_EMAIL is required'],
            [
                'ADMIN_EMAIL is only whitespace',
                () => (process.env.ADMIN_EMAIL = '   '),
                'ADMIN_EMAIL is required',
            ],
            [
                'ADMIN_PASSWORD is undefined',
                () => delete process.env.ADMIN_PASSWORD,
                'ADMIN_PASSWORD is required',
            ],
            ['ADMIN_PASSWORD is empty', () => (process.env.ADMIN_PASSWORD = ''), 'ADMIN_PASSWORD is required'],
        ])('exits 1 with a clear error when %s', async (_label, mutateEnv, expectedMessage) => {
            mutateEnv();

            const code = await invokeSeedAdmin();

            expect(code).toBe(1);
            expect(console.error).toHaveBeenCalledWith('Admin seed failed:', expectedMessage);
        });

        it('never bootstraps a context or seeds when the email is missing', async () => {
            delete process.env.ADMIN_EMAIL;

            await invokeSeedAdmin();

            expect(mockCreateApplicationContext).not.toHaveBeenCalled();
            expect(mockSeedAdmin).not.toHaveBeenCalled();
            expect(mockClose).not.toHaveBeenCalled();
        });

        it('never bootstraps a context or seeds when the password is missing', async () => {
            delete process.env.ADMIN_PASSWORD;

            await invokeSeedAdmin();

            expect(mockCreateApplicationContext).not.toHaveBeenCalled();
            expect(mockSeedAdmin).not.toHaveBeenCalled();
        });
    });

    describe('failure path — seedAdmin rejects', () => {
        it('surfaces the failure, exits 1, and still closes the context', async () => {
            mockSeedAdmin.mockRejectedValue(new Error('users table missing'));

            const code = await invokeSeedAdmin();

            expect(code).toBe(1);
            expect(console.error).toHaveBeenCalledWith('Admin seed failed:', 'users table missing');
            expect(mockClose).toHaveBeenCalledTimes(1);
        });

        it('logs the raw thrown value for a non-Error rejection', async () => {
            mockSeedAdmin.mockRejectedValue('boom');

            const code = await invokeSeedAdmin();

            expect(code).toBe(1);
            expect(console.error).toHaveBeenCalledWith('Admin seed failed:', 'boom');
            expect(mockClose).toHaveBeenCalledTimes(1);
        });
    });
});
