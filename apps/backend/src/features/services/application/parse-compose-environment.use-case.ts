import { parse } from 'yaml';

import { type ComposeEntries, toEntryMap } from '@shared/application/get-compose-entries.use-case';

/**
 * The shape of a reference `${VAR}` of the compose file. GitPaaS resolves no reference, so the name keeps an empty value.
 */
// eslint-disable-next-line optimize-regex/optimize-regex
const INTERPOLATION_PATTERN = /\$\{.*\}/;

/**
 * Tells whether a value of the compose file is a block of entries, in either the list or the map form.
 *
 * @param value Value the key `environment` of a compose service carries
 *
 * @returns `true` when the value holds entries the parser can read
 */
function isComposeEntries(value: unknown): value is ComposeEntries {
    return Array.isArray(value) ? value.every((entry) => typeof entry === 'string') : typeof value === 'object' && value !== null;
}

/**
 * Gives the empty value to every entry of the map form that declares a name alone (`FOO:`).
 *
 * @param entries Block of entries of one compose service
 *
 * @returns The block, with no entry of a value `null`
 */
function withEmptyValueForNull(entries: ComposeEntries): ComposeEntries {
    if (Array.isArray(entries)) {
        return entries;
    }

    return Object.fromEntries(Object.entries(entries).map(([name, value]) => [name, value ?? '']));
}

/**
 * Reads the key `environment` of one compose service.
 *
 * @param service Compose service of the recipe
 *
 * @returns The names and the literal values the service declares
 */
function readServiceEnvironment(service: unknown): Record<string, string> {
    if (typeof service !== 'object' || service === null) {
        return {};
    }

    const environment = (service as { environment?: unknown }).environment;

    if (!isComposeEntries(environment)) {
        return {};
    }

    return toEntryMap(withEmptyValueForNull(environment));
}

/**
 * Use case that reads the names and the literal values of the key `environment` of every service of a compose file.
 *
 * @param text Text of the compose file
 *
 * @returns The literal value of every name the compose file declares, keyed by name
 *
 * @throws {Error} When the text is no valid YAML
 */
export function parseComposeEnvironmentUseCase(text: string): Record<string, string> {
    const document: unknown = parse(text);

    if (typeof document !== 'object' || document === null) {
        return {};
    }

    const services = (document as { services?: unknown }).services;

    if (typeof services !== 'object' || services === null) {
        return {};
    }

    const variables: Record<string, string> = {};

    for (const service of Object.values(services)) {
        for (const [name, value] of Object.entries(readServiceEnvironment(service))) {
            if (!(name in variables)) {
                // eslint-disable-next-line security/detect-object-injection
                variables[name] = INTERPOLATION_PATTERN.test(value) ? '' : value;
            }
        }
    }

    return variables;
}
