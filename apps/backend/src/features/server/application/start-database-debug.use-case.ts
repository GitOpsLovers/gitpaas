import { randomBytes } from 'node:crypto';

import type { DatabaseDebugSession } from '@gitpaas/contracts';

import {
    DEBUG_CONSOLE_EMAIL,
    DEBUG_CONSOLE_PORT,
    DEBUG_CONTAINER_LABELS,
    DEBUG_CONTAINER_NAME,
    POSTGRES_CONTAINER_NAME,
} from '../domain/constants/database-debug.constants';
import { DatabaseDebugNetworkUnknownError } from '../domain/errors/server.errors';
import type { DatabaseDebugSettings } from '../domain/models/database-debug.models';
import type { DebugRole } from '../domain/ports/debug-role.port';

import { stopDatabaseDebugUseCase } from './stop-database-debug.use-case';

import { pullImageUseCase } from '@core/application/pull-image.use-case';
import type { ContainerRuntime } from '@core/domain/ports/container-runtime.port';

/**
 * The number of random bytes the generated password of the console carries.
 */
const CONSOLE_PASSWORD_BYTES = 18;

/**
 * Reads the network the container of PostgreSQL of the control plane is attached to.
 *
 * @param runtime Container runtime port
 *
 * @returns The name of the network the console of the debug must join
 *
 * @throws DatabaseDebugNetworkUnknownError When no network of PostgreSQL was found
 */
async function findDatabaseNetwork(runtime: ContainerRuntime): Promise<string> {
    const containers = await runtime.listContainers({}, true);
    const postgres = containers.find((container) =>
        container.names.some((name) => name.replace(/^\//, '') === POSTGRES_CONTAINER_NAME));
    const [network] = postgres?.networks ?? [];

    if (network === undefined) {
        throw new DatabaseDebugNetworkUnknownError();
    }

    return network;
}

/**
 * Starts the session of the debug of the database, and answers its credentials one time.
 *
 * @param runtime Container runtime port
 * @param role Debug role port
 * @param settings Parameters the session runs under
 *
 * @returns The address of the console, and the passwords the caller gives one time
 *
 * @throws DatabaseDebugNetworkUnknownError When no network of PostgreSQL was found
 * @throws Error When the pull of the image of the console failed
 */
export async function startDatabaseDebugUseCase(
    runtime: ContainerRuntime,
    role: DebugRole,
    settings: DatabaseDebugSettings,
): Promise<DatabaseDebugSession> {
    const network = await findDatabaseNetwork(runtime);

    await stopDatabaseDebugUseCase(runtime, role);

    // The host may hold no copy of the image, and the pull outlasts every other step,
    // so it runs before the grant: a failed pull then leaves the database closed.
    await pullImageUseCase(runtime, settings.image);

    const credentials = await role.grantLogin();
    const consolePassword = randomBytes(CONSOLE_PASSWORD_BYTES).toString('hex');

    try {
        await runtime.runDetachedContainer({
            image: settings.image,
            command: [],
            binds: [],
            name: DEBUG_CONTAINER_NAME,
            labels: { ...DEBUG_CONTAINER_LABELS },
            env: {
                PGADMIN_DEFAULT_EMAIL: DEBUG_CONSOLE_EMAIL,
                PGADMIN_DEFAULT_PASSWORD: consolePassword,
                PGADMIN_LISTEN_PORT: String(DEBUG_CONSOLE_PORT),
                PGADMIN_CONFIG_MASTER_PASSWORD_REQUIRED: 'False',
                PGADMIN_CONFIG_CHECK_EMAIL_DELIVERABILITY: 'False',
            },
            portBindings: [{ containerPort: DEBUG_CONSOLE_PORT, hostPort: settings.hostPort }],
            network,
        });
    } catch (error) {
        // The role holds a login already, so a failed start would leave the database open.
        await role.revokeLogin();

        throw error;
    }

    return {
        url: settings.consoleUrl,
        console: { email: DEBUG_CONSOLE_EMAIL, password: consolePassword },
        connection: {
            host: settings.databaseHost,
            port: settings.databasePort,
            database: settings.databaseName,
            role: credentials.role,
            password: credentials.password,
        },
    };
}
