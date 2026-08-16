import { readFileSync } from 'node:fs';
import { dirname, join, parse } from 'node:path';

import { TELEMETRY_UNKNOWN_VERSION } from '../../domain/constants/telemetry.constants';

/**
 * Name of the root manifest of the monorepo the version is read from.
 */
const ROOT_PACKAGE_NAME = '@gitopslovers/gitpaas';

/**
 * Version resolved on the first call, reused by every later one.
 */
let cachedVersion: string | undefined;

/**
 * Reads the manifest sitting in a directory.
 *
 * @param directory Directory the manifest is looked up in
 *
 * @returns The parsed manifest, or `undefined` when it is missing or unusable
 */
function readManifest(directory: string): { name?: unknown; version?: unknown } | undefined {
    try {
        // eslint-disable-next-line security/detect-non-literal-fs-filename
        const raw = readFileSync(join(directory, 'package.json'), 'utf8');
        const parsed: unknown = JSON.parse(raw);

        return typeof parsed === 'object' && parsed !== null ? (parsed) : undefined;
    } catch {
        return undefined;
    }
}

/**
 * Walks up from the compiled file directory looking for the root manifest.
 *
 * @returns The version of the root manifest, or `undefined` when it is not found
 */
function readRootPackageVersion(): string | undefined {
    let directory = __dirname;
    const { root } = parse(directory);

    for (;;) {
        const manifest = readManifest(directory);

        if (manifest?.name === ROOT_PACKAGE_NAME && typeof manifest.version === 'string' && manifest.version.length > 0) {
            return manifest.version;
        }

        if (directory === root) {
            return undefined;
        }

        directory = dirname(directory);
    }
}

/**
 * Resolves the version every telemetry event is stamped with.
 *
 * The build may stamp it through `APP_VERSION`; otherwise it comes from the root
 * manifest of the monorepo. The result is resolved once and cached, and any read
 * failure falls back to the unknown version so telemetry never throws.
 *
 * @returns The version published as `service.version`
 */
export function resolveServiceVersion(): string {
    if (cachedVersion !== undefined) {
        return cachedVersion;
    }

    const stamped = process.env.APP_VERSION;

    cachedVersion = typeof stamped === 'string' && stamped.length > 0 ? stamped : (readRootPackageVersion() ?? TELEMETRY_UNKNOWN_VERSION);

    return cachedVersion;
}

/**
 * Drops the cached version so the next call resolves it again.
 *
 * Exposed for specs that exercise the resolution order; production code never
 * needs it.
 */
export function resetServiceVersionCache(): void {
    cachedVersion = undefined;
}
