import { resolve } from 'node:path';

import type { RuntimeComposeProject } from '@core/domain/models/container-runtime.models';
import { COMPOSE_PROJECT_LABEL, COMPOSE_SERVICE_LABEL } from '@core/infrastructure/docker/docker-container-runtime.transformer';
import { getGitpaasLabels } from '@shared/application/get-gitpaas-labels.use-case';

/** A service's `build` block, in either the shorthand (string) or long (object) form. */
type ComposeBuild = string | { context?: string; dockerfile?: string; args?: string[] | Record<string, unknown>; target?: string };

/** A service's `healthcheck` block (only the duration fields we normalize). */
interface ComposeHealthcheck {
    interval?: string | number;
    timeout?: string | number;
    start_period?: string | number;
}

/** A compose `labels` block, in either the list (`KEY=value`) or map form. */
type ComposeLabels = string[] | Record<string, unknown>;

/** The subset of a compose service the executor reads/rewrites. */
interface ComposeService {
    image?: string;
    build?: ComposeBuild;
    healthcheck?: ComposeHealthcheck;
    labels?: ComposeLabels;
}

/** The subset of a top-level compose volume/network the executor rewrites. */
interface ComposeResource {
    labels?: ComposeLabels;
}

/** The parsed compose recipe exposed by `dockerode-compose`. */
interface ComposeRecipe {
    services?: Record<string, ComposeService>;
    volumes?: Record<string, ComposeResource | null>;
    networks?: Record<string, ComposeResource | null>;
}

/**
 * Normalises a compose `labels` block (list or map form) into a label map.
 *
 * @param labels Compose labels block, if any
 *
 * @returns Labels as a `{ key: value }` map
 */
function toLabelMap(labels?: ComposeLabels): Record<string, string> {
    if (!labels) {
        return {};
    }

    if (Array.isArray(labels)) {
        return Object.fromEntries(labels.map((entry) => {
            const separator = entry.indexOf('=');

            return separator === -1
                ? [entry, '']
                : [entry.slice(0, separator), entry.slice(separator + 1)];
        }));
    }

    return Object.fromEntries(Object.entries(labels).map(([key, value]) => [key, String(value)]));
}

/**
 * Renders a label map as the `KEY=value` list form `dockerode-compose` parses.
 *
 * @param labels Label map
 *
 * @returns Labels as a `KEY=value` list
 */
function toLabelList(labels: Record<string, string>): string[] {
    return Object.entries(labels).map(([key, value]) => `${key}=${value}`);
}

/**
 * Returns every top-level volume and network declared by a compose recipe,
 * materialising the `null` shorthand (`volumes: { data: }`) into an object.
 *
 * @param compose Compose project driven by the container runtime
 *
 * @returns Declared volume and network definitions
 */
function recipeResources(compose: RuntimeComposeProject): ComposeResource[] {
    const recipe = (compose as unknown as { recipe?: ComposeRecipe }).recipe;
    const resources: ComposeResource[] = [];

    for (const collection of [recipe?.volumes, recipe?.networks]) {
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

/** A resolved build definition ready to hand to the runtime's image build. */
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
    const recipe = (compose as unknown as { recipe?: ComposeRecipe }).recipe;

    return recipe?.services ?? {};
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
 * Normalises compose build args (list `KEY=value` or map form) into the
 * `{ key: value }` object the Docker API expects.
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
 * Resolves a compose `build` block into an absolute context path, dockerfile and
 * build args relative to the compose file's directory.
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
 * `dockerode-compose` throws on a healthcheck whose `interval`, `timeout` or
 * `start_period` is omitted (it calls `.includes()` on `undefined`) and
 * mis-parses second-based strings like `5s` into `NaN`. Numeric values are
 * passed straight through to the daemon, so converting here fixes both.
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
 * Stamps the GitPaaS ownership labels on every resource the stack will create:
 * each service's containers plus the top-level volumes and networks.
 *
 * `dockerode-compose` **overwrites** a container's labels with the service's
 * own `labels` block whenever one is declared, discarding the compose
 * project/service labels it had set — and it only understands the list form
 * (`KEY=value`). Both the GitPaaS labels and the compose labels are therefore
 * merged into a normalised list form here, preserving user-declared labels.
 * Volumes and networks are safe to merge as a map, since the library spreads
 * their `labels` object.
 *
 * @param compose Compose project driven by the container runtime
 * @param projectName Compose project name the stack is grouped under
 */
export function stampLabels(compose: RuntimeComposeProject, projectName: string): void {
    const gitpaas = getGitpaasLabels(projectName);

    for (const [name, service] of Object.entries(recipeServices(compose))) {
        service.labels = toLabelList({
            ...toLabelMap(service.labels),
            ...gitpaas,
            [COMPOSE_PROJECT_LABEL]: projectName,
            [COMPOSE_SERVICE_LABEL]: name,
        });
    }

    for (const resource of recipeResources(compose)) {
        resource.labels = { ...toLabelMap(resource.labels), ...gitpaas };
    }
}
