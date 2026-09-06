import { Readable } from 'node:stream';

import {
    DEBUG_CONSOLE_EMAIL,
    DEBUG_CONSOLE_PORT,
    DEBUG_CONTAINER_LABELS,
    DEBUG_CONTAINER_NAME,
} from '../../domain/constants/database-debug.constants';
import { DatabaseDebugNetworkUnknownError } from '../../domain/errors/server.errors';
import type { DatabaseDebugSettings } from '../../domain/models/database-debug.models';
import type { DebugRole, DebugRoleCredentials } from '../../domain/ports/debug-role.port';
import { startDatabaseDebugUseCase } from '../start-database-debug.use-case';
import { stopDatabaseDebugUseCase } from '../stop-database-debug.use-case';

import type { RuntimeContainerSummary } from '@core/domain/models/container-runtime.models';
import type { ContainerRuntime } from '@core/domain/ports/container-runtime.port';

jest.mock('../stop-database-debug.use-case');

const mockStopDatabaseDebugUseCase = stopDatabaseDebugUseCase as jest.MockedFunction<
    typeof stopDatabaseDebugUseCase
>;

const settings: DatabaseDebugSettings = {
    image: 'elestio/pgadmin:REL-9_17',
    hostPort: 5050,
    consoleUrl: 'http://gitpaas.example.com:5050',
    databaseHost: 'postgres',
    databasePort: 5432,
    databaseName: 'gitpaas',
};

const credentials: DebugRoleCredentials = { role: 'gitpaas_debug', password: 'a-generated-password' };

/**
 * Builds the summary of a container of the host, overriding only the fields under test.
 */
const container = (overrides: Partial<RuntimeContainerSummary> = {}): RuntimeContainerSummary => ({
    id: 'c0ffee00',
    names: ['/gitpaas-postgres'],
    image: 'postgres:17.6-alpine3.22',
    state: 'running',
    status: 'Up 2 hours',
    createdAt: new Date('2026-09-06T08:00:00.000Z'),
    projects: ['gitpaas'],
    serviceId: null,
    ephemeral: false,
    ports: [],
    networks: ['gitpaas_default'],
    mounts: [],
    ...overrides,
});

describe('startDatabaseDebugUseCase', () => {
    let mockContainerRuntime: jest.Mocked<
        Pick<ContainerRuntime, 'listContainers' | 'pullImage' | 'followProgress' | 'runDetachedContainer'>
    >;
    let mockDebugRole: jest.Mocked<Pick<DebugRole, 'grantLogin' | 'revokeLogin'>>;

    /** Runs the use case with the mocked ports. */
    const run = (): Promise<unknown> =>
        startDatabaseDebugUseCase(
            mockContainerRuntime as unknown as ContainerRuntime,
            mockDebugRole,
            settings,
        );

    beforeEach(() => {
        jest.clearAllMocks();
        mockContainerRuntime = {
            listContainers: jest.fn().mockResolvedValue([container()]),
            pullImage: jest.fn().mockResolvedValue(Readable.from([])),
            followProgress: jest.fn((_stream, onFinished, _onProgress) => { onFinished(undefined); }),
            runDetachedContainer: jest.fn().mockResolvedValue('started-id'),
        };
        mockDebugRole = {
            grantLogin: jest.fn().mockResolvedValue(credentials),
            revokeLogin: jest.fn().mockResolvedValue(undefined),
        };
        mockStopDatabaseDebugUseCase.mockResolvedValue({ running: false, url: null });
    });

    it('ends any session that still runs, and pulls the image, before it grants a new login', async () => {
        const order: string[] = [];
        // eslint-disable-next-line @typescript-eslint/require-await
        mockStopDatabaseDebugUseCase.mockImplementation(async () => {
            order.push('stop');

            return { running: false, url: null };
        });
        // eslint-disable-next-line @typescript-eslint/require-await
        mockContainerRuntime.pullImage.mockImplementation(async () => {
            order.push('pull');

            return Readable.from([]);
        });
        // eslint-disable-next-line @typescript-eslint/require-await
        mockDebugRole.grantLogin.mockImplementation(async () => {
            order.push('grant');

            return credentials;
        });
        // eslint-disable-next-line @typescript-eslint/require-await
        mockContainerRuntime.runDetachedContainer.mockImplementation(async () => {
            order.push('run');

            return 'started-id';
        });

        await run();

        expect(order).toEqual(['stop', 'pull', 'grant', 'run']);
        expect(mockStopDatabaseDebugUseCase).toHaveBeenCalledWith(mockContainerRuntime, mockDebugRole);
    });

    it('starts the console on the network of the container of PostgreSQL', async () => {
        mockContainerRuntime.listContainers.mockResolvedValue([
            container({ id: 'other', names: ['/gitpaas-redis'], networks: ['other-network'] }),
            container({ networks: ['gitpaas_default', 'gitpaas-proxy'] }),
        ]);

        await run();

        expect(mockContainerRuntime.runDetachedContainer).toHaveBeenCalledWith(
            expect.objectContaining({ network: 'gitpaas_default' }),
        );
    });

    it('starts the pinned image under the name and the labels of the debug', async () => {
        await run();

        expect(mockContainerRuntime.runDetachedContainer).toHaveBeenCalledTimes(1);
        expect(mockContainerRuntime.runDetachedContainer).toHaveBeenCalledWith(
            expect.objectContaining({
                image: settings.image,
                name: DEBUG_CONTAINER_NAME,
                labels: DEBUG_CONTAINER_LABELS,
                command: [],
                binds: [],
            }),
        );
    });

    it('publishes the port of the console on the port of the host the environment names', async () => {
        await run();

        expect(mockContainerRuntime.runDetachedContainer).toHaveBeenCalledWith(
            expect.objectContaining({
                portBindings: [{ containerPort: DEBUG_CONSOLE_PORT, hostPort: settings.hostPort }],
            }),
        );
    });

    it('hands the console the account and the password it is entered with', async () => {
        const session = await run() as { console: { email: string; password: string } };
        const [options] = mockContainerRuntime.runDetachedContainer.mock.calls[0];

        expect(options.env).toEqual({
            PGADMIN_DEFAULT_EMAIL: DEBUG_CONSOLE_EMAIL,
            PGADMIN_DEFAULT_PASSWORD: session.console.password,
            PGADMIN_LISTEN_PORT: String(DEBUG_CONSOLE_PORT),
            PGADMIN_CONFIG_MASTER_PASSWORD_REQUIRED: 'False',
            PGADMIN_CONFIG_CHECK_EMAIL_DELIVERABILITY: 'False',
        });
    });

    it('answers the address of the console, its account, and the connection to the database', async () => {
        const session = await run() as { url: string; console: { email: string }; connection: unknown };

        expect(session.url).toBe(settings.consoleUrl);
        expect(session.console.email).toBe(DEBUG_CONSOLE_EMAIL);
        expect(session.connection).toEqual({
            host: settings.databaseHost,
            port: settings.databasePort,
            database: settings.databaseName,
            role: credentials.role,
            password: credentials.password,
        });
    });

    it('generates a password of the console apart from the one of the role', async () => {
        const first = await run() as { console: { password: string } };
        const second = await run() as { console: { password: string } };

        expect(first.console.password).not.toBe(credentials.password);
        expect(first.console.password).not.toBe(second.console.password);
        expect(first.console.password).toMatch(/^[\da-f]{36}$/);
    });

    it('throws when no container of PostgreSQL runs, and it grants no login', async () => {
        mockContainerRuntime.listContainers.mockResolvedValue([container({ names: ['/gitpaas-redis'] })]);

        await expect(run()).rejects.toBeInstanceOf(DatabaseDebugNetworkUnknownError);
        expect(mockStopDatabaseDebugUseCase).not.toHaveBeenCalled();
        expect(mockDebugRole.grantLogin).not.toHaveBeenCalled();
        expect(mockContainerRuntime.pullImage).not.toHaveBeenCalled();
        expect(mockContainerRuntime.runDetachedContainer).not.toHaveBeenCalled();
    });

    it('throws when the container of PostgreSQL joins no network', async () => {
        mockContainerRuntime.listContainers.mockResolvedValue([container({ networks: [] })]);

        await expect(run()).rejects.toBeInstanceOf(DatabaseDebugNetworkUnknownError);
    });

    it('pulls the pinned image of the console, and waits for the end of the pull', async () => {
        await run();

        expect(mockContainerRuntime.pullImage).toHaveBeenCalledTimes(1);
        expect(mockContainerRuntime.pullImage).toHaveBeenCalledWith(settings.image);
        expect(mockContainerRuntime.followProgress).toHaveBeenCalledTimes(1);
    });

    it('grants no login and starts no console when the pull of the image fails', async () => {
        const failure = new Error('no such image');
        mockContainerRuntime.followProgress.mockImplementation((_stream, onFinished, _onProgress) => { onFinished(failure); });

        await expect(run()).rejects.toThrow(failure);
        expect(mockDebugRole.grantLogin).not.toHaveBeenCalled();
        expect(mockDebugRole.revokeLogin).not.toHaveBeenCalled();
        expect(mockContainerRuntime.runDetachedContainer).not.toHaveBeenCalled();
    });

    it('revokes the login when the start of the console fails, and it propagates the failure', async () => {
        const failure = new Error('no such image');
        mockContainerRuntime.runDetachedContainer.mockRejectedValue(failure);

        await expect(run()).rejects.toThrow(failure);
        expect(mockDebugRole.revokeLogin).toHaveBeenCalledTimes(1);
    });
});
