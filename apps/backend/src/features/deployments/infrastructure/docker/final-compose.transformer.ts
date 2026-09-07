import { relative, sep } from 'node:path';

import { stringify } from 'yaml';

import type { ComposeRecipe } from './compose-recipe.transformer';
import { composeRecipe, isBindMountSource } from './compose-recipe.transformer';

import type { RuntimeComposeProject } from '@core/domain/models/container-runtime.models';
import { PROXY_NETWORK } from '@features/domains/infrastructure/traefik/traefik-reverse-proxy.constants';

/**
 * The subset of a compose service the final Compose text rewrites.
 */
type ComposeService = NonNullable<ComposeRecipe['services']>[string];

/**
 * An entry of the `volumes` block of a compose service, in either the short (`source:target`) or the long (object) form.
 */
type ComposeServiceVolume = NonNullable<ComposeService['volumes']>[number];

/**
 * The `environment` block of a compose service, in either the list (`KEY=value`) or the map form.
 */
type ComposeEnvironment = NonNullable<ComposeService['environment']>;

/**
 * The `networks` block of a compose service, in the map form the final Compose text writes.
 */
type ComposeServiceNetworkMap = Record<string, unknown>;

/**
 * Normalises the `networks` block of a compose service into the map form, which alone carries the aliases of a network.
 *
 * @param networks `networks` block of the compose service, if any
 *
 * @returns The `networks` block as a map, where a network of the list form carries no options
 */
function toNetworkMap(networks?: NonNullable<ComposeService['networks']>): ComposeServiceNetworkMap {
    if (!networks) {
        return {};
    }

    if (Array.isArray(networks)) {
        return Object.fromEntries(networks.map((name) => [name, null]));
    }

    return { ...networks };
}

/**
 * Value every variable of the final Compose text carries, so no secret of a service leaves the server.
 */
export const MASKED_VALUE = '****';

/**
 * Rewrites the source of a bind mount back into the path relative to the compose file the recipe of the repository declared.
 *
 * @param source Source of the bind mount, which `resolveBindMounts` turned into an absolute path
 * @param baseDir Directory containing the compose file
 *
 * @returns The source relative to the directory of the compose file, or the source unchanged when it lies outside it
 */
export function relativizeBindSource(source: string, baseDir: string): string {
    if (source !== baseDir && !source.startsWith(`${baseDir}${sep}`)) {
        return source;
    }

    const path = relative(baseDir, source);

    return path === '' ? '.' : `./${path}`;
}

/**
 * Rewrites one entry of the `volumes` block of a service back to its relative source, in either the short or the long form.
 *
 * @param volume Entry of the `volumes` block
 * @param baseDir Directory containing the compose file
 *
 * @returns The entry with a relative bind source, or the entry unchanged when it declares a named volume
 */
export function relativizeServiceVolume(volume: ComposeServiceVolume, baseDir: string): ComposeServiceVolume {
    if (typeof volume === 'string') {
        const [source, ...rest] = volume.trim().split(':');

        if (rest.length === 0 || !isBindMountSource(source)) {
            return volume;
        }

        return [relativizeBindSource(source, baseDir), ...rest].join(':');
    }

    const { type, source } = volume as { type?: unknown; source?: unknown };

    if (typeof source !== 'string' || (type === undefined ? !isBindMountSource(source) : type !== 'bind')) {
        return volume;
    }

    return { ...volume, source: relativizeBindSource(source, baseDir) };
}

/**
 * Rewrites the source of every bind mount of a recipe back to the path relative to the compose file of the repository.
 *
 * @param recipe Parsed compose recipe the final Compose text is dumped from
 * @param baseDir Directory containing the compose file
 */
export function relativizeBindMounts(recipe: ComposeRecipe, baseDir: string): void {
    for (const service of Object.values(recipe.services ?? {})) {
        if (!service.volumes) {
            continue;
        }

        service.volumes = service.volumes.map((volume) => relativizeServiceVolume(volume, baseDir));
    }
}

/**
 * Masks the value of every entry of an `environment` block, in either the list or the map form.
 *
 * @param environment `environment` block of a compose service
 *
 * @returns The block with the value of every entry masked, in the form it arrived with
 */
export function maskEntries(environment: ComposeEnvironment): ComposeEnvironment {
    if (Array.isArray(environment)) {
        return environment.map((entry) => {
            const separator = entry.indexOf('=');

            // A bare key carries no value in the file, and the container reads it from the host.
            return separator === -1 ? entry : `${entry.slice(0, separator)}=${MASKED_VALUE}`;
        });
    }

    return Object.fromEntries(Object.keys(environment).map((key) => [key, MASKED_VALUE]));
}

/**
 * Replaces the value of every variable of the `environment` block of every service of a recipe with the mask.
 *
 * @param recipe Parsed compose recipe the final Compose text is dumped from
 */
export function maskEnvironment(recipe: ComposeRecipe): void {
    for (const service of Object.values(recipe.services ?? {})) {
        if (!service.environment) {
            continue;
        }

        service.environment = maskEntries(service.environment);
    }
}

/**
 * Declares on a recipe the networks the executor attaches after the start of the stack.
 *
 * @param recipe Parsed compose recipe the final Compose text is dumped from
 * @param routed Names of the compose services that carry the routing, which join the network of the proxy
 * @param networks Names on the daemon of the networks of the project the containers of the stack join
 * @param networkAlias Alias the containers answer to on the networks of the project
 * @param recipeNetworks Names on the daemon of the external networks of the recipe, grouped by the compose service that declared them
 */
export function declareAttachedNetworks(
    recipe: ComposeRecipe,
    routed: Set<string>,
    networks: string[],
    networkAlias: string,
    recipeNetworks: Record<string, string[]> = {},
): void {
    const stripped = Object.values(recipeNetworks).flat();

    if (routed.size === 0 && networks.length === 0 && stripped.length === 0) {
        return;
    }

    const declared = { ...recipe.networks };

    if (routed.size > 0) {
        // eslint-disable-next-line security/detect-object-injection
        declared[PROXY_NETWORK] = { external: true };
    }

    for (const network of [...networks, ...stripped]) {
        // eslint-disable-next-line security/detect-object-injection
        declared[network] = { external: true };
    }

    Object.assign(recipe, { networks: declared });

    for (const [name, service] of Object.entries(recipe.services ?? {})) {
        const attached: ComposeServiceNetworkMap = {};

        if (routed.has(name)) {
            // eslint-disable-next-line security/detect-object-injection
            attached[PROXY_NETWORK] = null;
        }

        for (const network of networks) {
            // eslint-disable-next-line security/detect-object-injection
            attached[network] = { aliases: [networkAlias] };
        }

        // eslint-disable-next-line security/detect-object-injection
        for (const network of recipeNetworks[name] ?? []) {
            // eslint-disable-next-line security/detect-object-injection
            attached[network] = { aliases: [name] };
        }

        if (Object.keys(attached).length === 0) {
            continue;
        }

        service.networks = { ...toNetworkMap(service.networks), ...attached };
    }
}

/**
 * Dumps the final Compose text of a deployment.
 *
 * @param compose Compose project driven by the container runtime
 * @param baseDir Directory containing the compose file
 * @param routed Names of the compose services that carry the routing
 * @param networks Names on the daemon of the networks of the project the containers of the stack join
 * @param networkAlias Alias the containers answer to on the networks of the project
 * @param recipeNetworks Names on the daemon of the external networks stripped from the recipe, grouped by the compose service that declared them
 *
 * @returns The final Compose text, as YAML
 */
export function toFinalComposeText(
    compose: RuntimeComposeProject,
    baseDir: string,
    routed: Set<string>,
    networks: string[],
    networkAlias: string,
    recipeNetworks: Record<string, string[]> = {},
): string {
    // The recipe the daemon receives keeps its true values, so every rewrite lands on a copy of it.
    const recipe = structuredClone(composeRecipe(compose));

    declareAttachedNetworks(recipe, routed, networks, networkAlias, recipeNetworks);
    relativizeBindMounts(recipe, baseDir);
    maskEnvironment(recipe);

    return stringify(recipe);
}
