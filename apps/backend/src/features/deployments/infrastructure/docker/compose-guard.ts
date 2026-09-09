import { COMPOSE_DOMAIN_KEY, declaredDomainSchema } from '@gitpaas/contracts';

import { isBindMountSource } from './compose-recipe.transformer';
import type { ComposeRecipe } from './compose-recipe.transformer';

import { GITPAAS_OWNED_NETWORKS } from '@core/domain/constants/gitpaas-networks.constants';
import { UnsafeComposeRecipeError } from '@core/domain/errors/compose.errors';

/**
 * A top-level network of a recipe, as the recipe writes it.
 */
type ComposeRecipeNetwork = NonNullable<ComposeRecipe['networks']>[string];

/**
 * Every key GitPaaS lets a compose service declare.
 */
const ALLOWED_SERVICE_KEYS = new Set([
    'build',
    'cap_drop',
    'command',
    'container_name',
    'cpu_shares',
    'cpus',
    'depends_on',
    'dns',
    'dns_search',
    'entrypoint',
    'environment',
    'expose',
    'extra_hosts',
    'healthcheck',
    'hostname',
    'image',
    'init',
    'ipc',
    'labels',
    'logging',
    'mem_limit',
    'mem_reservation',
    'memswap_limit',
    'network_mode',
    'networks',
    'pid',
    'pids_limit',
    'platform',
    'ports',
    'profiles',
    'pull_policy',
    'read_only',
    'restart',
    'shm_size',
    'stdin_open',
    'stop_grace_period',
    'stop_signal',
    'tmpfs',
    'tty',
    'ulimits',
    'user',
    'volumes',
    'working_dir',
    COMPOSE_DOMAIN_KEY,
]);

/**
 * The keys of a namespace of the kernel a compose service shares.
 */
const NAMESPACE_KEYS = ['network_mode', 'pid', 'ipc'];

/**
 * The values of a namespace key that leave the stack of the user.
 */
const HOST_NAMESPACE_VALUES = new Set(['host', 'shareable']);

/**
 * Refuses one key of a compose service.
 *
 * @param service Name of the compose service the key belongs to
 * @param key Key of the compose service, as the recipe writes it
 * @param reason Why GitPaaS refuses that key
 *
 * @throws {UnsafeComposeRecipeError} Always
 */
function refuse(service: string, key: string, reason: string): never {
    throw new UnsafeComposeRecipeError(`services.${service}.${key}`, reason);
}

/**
 * Refuses the source of a bind mount that leaves the folder of the repository of the service.
 *
 * @param service Name of the compose service the mount belongs to
 * @param entry Entry of the `volumes` block, as the recipe writes it
 * @param source Source of the bind mount
 *
 * @throws {UnsafeComposeRecipeError} When the source is absolute, names the home folder, or holds one segment `..`
 */
function assertSafeBindSource(service: string, entry: string, source: string): void {
    if (source.startsWith('/') || source.startsWith('~')) {
        refuse(
            service,
            'volumes',
            `the mount "${entry}" binds a path of the host, such as the socket of Docker, and a mount reads the repository alone`,
        );
    }

    if (source.split('/').includes('..')) {
        refuse(service, 'volumes', `the mount "${entry}" leaves the folder of the repository with a segment ".."`);
    }
}

/**
 * Refuses one entry of the `volumes` block of a compose service, in either the short or the long form.
 *
 * @param service Name of the compose service the entry belongs to
 * @param volume Entry of the `volumes` block
 *
 * @throws {UnsafeComposeRecipeError} When the entry binds a path of the host
 */
function assertSafeVolume(service: string, volume: unknown): void {
    if (typeof volume === 'string') {
        const [source, ...rest] = volume.trim().split(':');

        // A lone path declares an anonymous volume, and carries no source on the host.
        if (rest.length === 0 || !isBindMountSource(source)) {
            return;
        }

        assertSafeBindSource(service, volume, source);

        return;
    }

    if (volume === null || typeof volume !== 'object') {
        return;
    }

    const { type, source } = volume as { type?: unknown; source?: unknown };

    if (typeof source !== 'string' || (type === undefined ? !isBindMountSource(source) : type !== 'bind')) {
        return;
    }

    assertSafeBindSource(service, source, source);
}

/**
 * Refuses the domain a compose service declares when it breaks the schema of the declared domain.
 *
 * @param name Name of the compose service the declaration belongs to
 * @param definition Definition of the compose service, as the recipe writes it
 *
 * @throws {UnsafeComposeRecipeError} When the value of the key `x-gitpaas-domain` carries no valid host, port and flag `https`
 */
function assertSafeDeclaredDomain(name: string, definition: Record<string, unknown>): void {
    // eslint-disable-next-line security/detect-object-injection
    const declaration = definition[COMPOSE_DOMAIN_KEY];

    if (declaration === undefined) {
        return;
    }

    const parsed = declaredDomainSchema.safeParse(declaration);

    if (!parsed.success) {
        refuse(
            name,
            COMPOSE_DOMAIN_KEY,
            `the declared domain carries the host, the port and the flag "https" alone: ${parsed.error.issues[0].message}`,
        );
    }
}

/**
 * Refuses one compose service that reaches the host.
 *
 * @param name Name of the compose service
 * @param service Definition of the compose service, as the recipe writes it
 *
 * @throws {UnsafeComposeRecipeError} When the service declares a key GitPaaS does not allow, or a domain the schema of the declared domain refuses
 */
function assertSafeService(name: string, service: unknown): void {
    if (service === null || typeof service !== 'object') {
        return;
    }

    const definition = service as Record<string, unknown>;

    for (const key of Object.keys(definition)) {
        if (!ALLOWED_SERVICE_KEYS.has(key)) {
            refuse(name, key, 'GitPaaS allows no such key of a compose service, because it reaches the host');
        }
    }

    for (const key of NAMESPACE_KEYS) {
        // eslint-disable-next-line security/detect-object-injection
        const value = definition[key];

        if (typeof value !== 'string') {
            continue;
        }

        const namespace = value.trim();

        // `service:` names a service of the same stack, and `container:` names any container of the daemon.
        if (HOST_NAMESPACE_VALUES.has(namespace) || namespace.startsWith('container:')) {
            refuse(name, key, `the value "${value}" shares a namespace of outside the stack with the container`);
        }
    }

    assertSafeDeclaredDomain(name, definition);

    const volumes = definition.volumes;

    if (Array.isArray(volumes)) {
        for (const volume of volumes) {
            assertSafeVolume(name, volume);
        }
    }
}

/**
 * Refuses one top-level network of a recipe that names a network GitPaaS owns.
 *
 * @param key Key the recipe gives the network
 * @param network Definition of the network, as the recipe writes it
 *
 * @throws {UnsafeComposeRecipeError} When the network reaches a network of GitPaaS itself
 */
function assertSafeNetwork(key: string, network: ComposeRecipeNetwork): void {
    const daemonName = network?.name ?? (network?.external === true ? key : undefined);

    if (daemonName !== undefined && GITPAAS_OWNED_NETWORKS.includes(daemonName.trim())) {
        throw new UnsafeComposeRecipeError(
            `networks.${key}`,
            `the network "${daemonName.trim()}" belongs to GitPaaS, and the stack of a user never joins it`,
        );
    }
}

/**
 * Refuses a compose recipe of a user that reaches the host of GitPaaS.
 *
 * @param recipe Parsed compose recipe, already interpolated
 *
 * @throws {UnsafeComposeRecipeError} When a service declares a key, a namespace or a mount that reaches the host, or when a network of the recipe names a network of GitPaaS
 */
export function assertSafeRecipe(recipe: ComposeRecipe): void {
    for (const [name, service] of Object.entries(recipe.services ?? {})) {
        assertSafeService(name, service);
    }

    for (const [key, network] of Object.entries(recipe.networks ?? {})) {
        assertSafeNetwork(key, network);
    }
}
