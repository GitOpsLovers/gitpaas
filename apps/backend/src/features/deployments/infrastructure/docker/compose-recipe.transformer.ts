import { resolve } from 'node:path';

import { COMPOSE_DEFAULT_NETWORK_KEY, getDefaultNetworkKeyUseCase } from '../../application/get-default-network-name.use-case';

import { GITPAAS_SERVICE_LABEL } from '@core/domain/constants/gitpaas-labels.constants';
import type { RuntimeComposeProject } from '@core/domain/models/container-runtime.models';
import { COMPOSE_PROJECT_LABEL, COMPOSE_SERVICE_LABEL } from '@core/infrastructure/docker/docker-container-runtime.transformer';
import type { RoutingLabels } from '@features/domains/domain/ports/reverse-proxy.port';
import type { VolumeMount } from '@features/volumes/domain/models/volume.models';
import { getGitpaasLabels } from '@shared/application/get-gitpaas-labels.use-case';

/**
 * A service's `build` block, in either the shorthand (string) or long (object) form.
 */
type ComposeBuild = string | { context?: string; dockerfile?: string; args?: string[] | Record<string, unknown>; target?: string };

/**
 * A service's `healthcheck` block (only the duration fields we normalize).
 */
interface ComposeHealthcheck {
    interval?: string | number;
    timeout?: string | number;
    start_period?: string | number;
}

/**
 * A block of `KEY=value` entries, in either the list or the map form.
 */
type ComposeEntries = string[] | Record<string, unknown>;

/**
 * A compose `labels` block, in either the list (`KEY=value`) or map form.
 */
type ComposeLabels = ComposeEntries;

/**
 * A compose `environment` block, in either the list (`KEY=value`) or map form.
 */
type ComposeEnvironment = ComposeEntries;

/**
 * An entry of the `volumes` block of a compose service, in either the short (`source:target`) or the long (object) form.
 */
type ComposeServiceVolume = string | Record<string, unknown>;

/**
 * The `networks` block of a compose service, in either the list or the map form.
 */
type ComposeServiceNetworks = string[] | Record<string, unknown>;

/**
 * The subset of a compose service the executor reads/rewrites.
 */
interface ComposeService {
    image?: string;
    build?: ComposeBuild;
    healthcheck?: ComposeHealthcheck;
    labels?: ComposeLabels;
    environment?: ComposeEnvironment;
    volumes?: ComposeServiceVolume[];
    networks?: ComposeServiceNetworks;
}

/**
 * The subset of a top-level compose volume/network the executor rewrites.
 */
interface ComposeResource {
    labels?: ComposeLabels;
    external?: boolean;
}

/**
 * The parsed compose recipe exposed by `dockerode-compose`.
 */
interface ComposeRecipe {
    services?: Record<string, ComposeService>;
    volumes?: Record<string, ComposeResource | null>;
    networks?: Record<string, ComposeResource | null>;
}

/**
 * Normalises a block of entries (list or map form) into a `{ key: value }` map.
 *
 * @param entries Compose labels or environment block, if any
 *
 * @returns Entries as a `{ key: value }` map
 */
function toEntryMap(entries?: ComposeEntries): Record<string, string> {
    if (!entries) {
        return {};
    }

    if (Array.isArray(entries)) {
        return Object.fromEntries(entries.map((entry) => {
            const separator = entry.indexOf('=');

            return separator === -1
                ? [entry, '']
                : [entry.slice(0, separator), entry.slice(separator + 1)];
        }));
    }

    return Object.fromEntries(Object.entries(entries).map(([key, value]) => [key, String(value)]));
}

/**
 * Renders a `{ key: value }` map as the `KEY=value` list form `dockerode-compose` parses.
 *
 * @param entries Entry map
 *
 * @returns Entries as a `KEY=value` list
 */
function toEntryList(entries: Record<string, string>): string[] {
    return Object.entries(entries).map(([key, value]) => `${key}=${value}`);
}

/**
 * Rebinds the `default` entry of the `networks` block of one compose service onto the key of its service.
 *
 * @param networks `networks` block of the compose service, if any
 * @param key Key the default network carries in the recipe
 *
 * @returns The rebound `networks` block of the compose service
 */
function rebindDefaultNetwork(networks: ComposeServiceNetworks | undefined, key: string): ComposeServiceNetworks {
    if (networks === undefined) {
        return [key];
    }

    if (Array.isArray(networks)) {
        return networks.map((name) => (name === COMPOSE_DEFAULT_NETWORK_KEY ? key : name));
    }

    const { [COMPOSE_DEFAULT_NETWORK_KEY]: declared, ...rest } = networks;

    return COMPOSE_DEFAULT_NETWORK_KEY in networks ? { ...rest, [key]: declared } : networks;
}

/**
 * Returns the parsed recipe of a compose project.
 *
 * @param compose Compose project driven by the container runtime
 *
 * @throws {Error} When the compose project carries no parsed recipe
 *
 * @returns Parsed compose recipe
 */
export function composeRecipe(compose: RuntimeComposeProject): ComposeRecipe {
    const recipe = (compose as unknown as { recipe?: ComposeRecipe }).recipe;

    if (!recipe) {
        throw new Error('The compose project carries no parsed recipe.');
    }

    return recipe;
}

/**
 * Returns every top-level volume and network declared by a compose recipe.
 *
 * @param compose Compose project driven by the container runtime
 *
 * @returns Declared volume and network definitions
 */
export function recipeResources(compose: RuntimeComposeProject): ComposeResource[] {
    const recipe = composeRecipe(compose);
    const resources: ComposeResource[] = [];

    for (const collection of [recipe.volumes, recipe.networks]) {
        if (!collection) {
            continue;
        }

        for (const [key, resource] of Object.entries(collection)) {
            const defined = resource ?? {};

            // eslint-disable-next-line security/detect-object-injection
            collection[key] = defined;
            resources.push(defined);
        }
    }

    return resources;
}

/**
 * A resolved build definition ready to hand to the runtime's image build.
 */
export interface ResolvedBuild {
    contextPath: string;
    dockerfile: string;
    buildargs?: Record<string, string>;
    target?: string;
}

/**
 * Returns the parsed services of a compose recipe.
 *
 * @param compose Compose project driven by the container runtime
 *
 * @returns Declared service definitions, keyed by service name
 */
export function recipeServices(compose: RuntimeComposeProject): Record<string, ComposeService> {
    return composeRecipe(compose).services ?? {};
}

/**
 * Parses a Compose duration (e.g. `1m30s`, `5s`, `500ms`) into nanoseconds.
 *
 * @param value Compose duration string, a raw number (assumed nanoseconds), or undefined
 *
 * @returns Duration in nanoseconds, or `0` when absent or unparseable
 */
export function toNanoseconds(value: string | number | undefined): number {
    if (typeof value === 'number') {
        return value;
    }

    if (typeof value !== 'string') {
        return 0;
    }

    const units: Record<string, number> = {
        ns: 1, us: 1e3, ms: 1e6, s: 1e9, m: 60e9, h: 3600e9,
    };
    // eslint-disable-next-line security/detect-unsafe-regex
    const pattern = /(\d+(?:\.\d+)?)(ns|us|ms|s|m|h)/g;
    let total = 0;
    let matched = false;

    for (let match = pattern.exec(value); match !== null; match = pattern.exec(value)) {
        matched = true;
        total += Number.parseFloat(match[1]) * units[match[2]];
    }

    return matched ? total : 0;
}

/**
 * Normalises compose build args (list `KEY=value` or map form) into the `{ key: value }` object the Docker API expects.
 *
 * @param args Compose build args
 *
 * @returns Build args as a `{ key: value }` map, or undefined when none are declared
 */
export function normalizeBuildArgs(args?: string[] | Record<string, unknown>): Record<string, string> | undefined {
    if (!args) {
        return undefined;
    }

    if (Array.isArray(args)) {
        return Object.fromEntries(args.map((entry) => {
            const separator = entry.indexOf('=');

            return separator === -1
                ? [entry, '']
                : [entry.slice(0, separator), entry.slice(separator + 1)];
        }));
    }

    return Object.fromEntries(Object.entries(args).map(([key, value]) => [key, String(value)]));
}

/**
 * Resolves a compose `build` block into an absolute context path, dockerfile and build args relative to the compose file's directory.
 *
 * @param build Compose build block (string shorthand or object form)
 * @param baseDir Directory containing the compose file
 *
 * @returns Build definition ready to hand to the runtime's image build
 */
export function resolveBuild(build: ComposeBuild, baseDir: string): ResolvedBuild {
    if (typeof build === 'string') {
        return { contextPath: resolve(baseDir, build), dockerfile: 'Dockerfile' };
    }

    return {
        contextPath: resolve(baseDir, build.context ?? '.'),
        dockerfile: build.dockerfile ?? 'Dockerfile',
        buildargs: normalizeBuildArgs(build.args),
        target: build.target,
    };
}

/**
 * Rewrites every service's healthcheck durations into numeric nanoseconds.
 *
 * @param compose Compose project driven by the container runtime
 */
export function normalizeHealthchecks(compose: RuntimeComposeProject): void {
    for (const service of Object.values(recipeServices(compose))) {
        const healthcheck = service.healthcheck;

        if (!healthcheck) {
            continue;
        }

        healthcheck.interval = toNanoseconds(healthcheck.interval);
        healthcheck.timeout = toNanoseconds(healthcheck.timeout);
        healthcheck.start_period = toNanoseconds(healthcheck.start_period);
    }
}

/**
 * Declares the default network of the recipe under the key of the service, which `dockerode-compose` otherwise creates as a bare `<project>_default` with no label.
 *
 * @param compose Compose project driven by the container runtime
 * @param serviceId Identifier of the service the stack belongs to
 *
 * @returns Key the default network carries in the recipe
 */
export function declareDefaultNetwork(compose: RuntimeComposeProject, serviceId: string): string {
    const recipe = composeRecipe(compose);
    const key = getDefaultNetworkKeyUseCase(serviceId);
    const { default: declared, ...networks } = recipe.networks ?? {};

    recipe.networks = { ...networks, [key]: declared ?? {} };

    for (const service of Object.values(recipeServices(compose))) {
        service.networks = rebindDefaultNetwork(service.networks, key);
    }

    return key;
}

/**
 * Stamps the GitPaaS ownership labels on every resource the stack will create.
 *
 * @param compose Compose project driven by the container runtime
 * @param projectName Compose project name the stack is grouped under
 * @param serviceId Identifier of the service the stack belongs to, which isolates its resources from those of its siblings
 */
export function stampLabels(compose: RuntimeComposeProject, projectName: string, serviceId: string): void {
    const gitpaas = { ...getGitpaasLabels(projectName), [GITPAAS_SERVICE_LABEL]: serviceId };

    for (const [name, service] of Object.entries(recipeServices(compose))) {
        service.labels = toEntryList({
            ...toEntryMap(service.labels),
            ...gitpaas,
            [COMPOSE_PROJECT_LABEL]: projectName,
            [COMPOSE_SERVICE_LABEL]: name,
        });
    }

    for (const resource of recipeResources(compose)) {
        resource.labels = { ...toEntryMap(resource.labels), ...gitpaas };
    }
}

/**
 * Stamps the labels of the routing onto the compose service that each domain names.
 *
 * @param compose Compose project driven by the container runtime
 * @param routing Labels of the routing, grouped by the compose service each domain names
 *
 * @returns The names of the compose services that received the labels of the routing
 */
export function stampRouting(compose: RuntimeComposeProject, routing: RoutingLabels): string[] {
    const services = recipeServices(compose);
    const stamped: string[] = [];

    for (const [name, labels] of Object.entries(routing)) {
        // eslint-disable-next-line security/detect-object-injection
        const service = services[name];

        if (!service) {
            continue;
        }

        service.labels = toEntryList({ ...toEntryMap(service.labels), ...labels });
        stamped.push(name);
    }

    return stamped;
}

/**
 * Merges the variables of the service into the environment of every container of the stack.
 *
 * @param compose Compose project driven by the container runtime
 * @param environment Variables of the service, keyed by name
 */
export function injectEnvironment(compose: RuntimeComposeProject, environment: Record<string, string>): void {
    if (Object.keys(environment).length === 0) {
        return;
    }

    for (const service of Object.values(recipeServices(compose))) {
        service.environment = toEntryList({
            ...toEntryMap(service.environment),
            ...environment,
        });
    }
}

/**
 * The mount one volume of the service takes in the recipe of the deployment.
 */
export interface ComposeVolumeMount extends VolumeMount {
    daemonKey: string;
}

/**
 * Mounts every volume of the service in the compose service that its mount names, and declares each one as an external top-level volume.
 *
 * @param compose Compose project driven by the container runtime
 * @param mounts Mounts of the volumes of the service, each one naming the compose service it belongs to
 *
 * @returns The names of the compose services that received a mount
 */
export function stampVolumes(compose: RuntimeComposeProject, mounts: ComposeVolumeMount[]): string[] {
    const recipe = composeRecipe(compose);
    const services = recipe.services ?? {};
    const stamped = new Set<string>();

    for (const mount of mounts) {
        const service = services[mount.composeServiceName];

        if (!service) {
            continue;
        }

        service.volumes = [
            ...service.volumes ?? [],
            `${mount.daemonKey}:${mount.containerPath}${mount.readOnly ? ':ro' : ''}`,
        ];

        recipe.volumes = { ...recipe.volumes, [mount.daemonKey]: { external: true } };
        stamped.add(mount.composeServiceName);
    }

    return [...stamped];
}
