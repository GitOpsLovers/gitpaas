import { parse } from 'yaml';

import { ComposeVolumeDeclaration, VolumeMount } from '../domain/models/volume.models';

/**
 * The mount one entry of the block `volumes` of a compose service declares, with the key of the volume it names.
 */
interface ComposeMountEntry {
    daemonKey: string;
    mount: VolumeMount;
}

/**
 * Tells whether the source of an entry of the block `volumes` of a compose service names a path of the host, and not a named volume.
 *
 * @param source Source of the entry, which is the part before the first `:`
 *
 * @returns `true` when the source names a path of the host
 */
function isBindMountSource(source: string): boolean {
    return source.startsWith('~') || source.includes('/');
}

/**
 * Reads the short form `source:target[:options]` of an entry of the block `volumes` of a compose service.
 *
 * @param entry Entry of the block `volumes`
 * @param composeServiceName Name of the compose service the entry belongs to
 *
 * @returns The mount of the named volume, or `null` when the entry declares a bind mount or an anonymous volume
 */
function readShortEntry(entry: string, composeServiceName: string): ComposeMountEntry | null {
    const [source, target, ...options] = entry.trim().split(':');

    if (target === undefined || source === '' || isBindMountSource(source)) {
        return null;
    }

    return {
        daemonKey: source,
        mount: { composeServiceName, containerPath: target, readOnly: options.includes('ro') },
    };
}

/**
 * Reads the long form of an entry of the block `volumes` of a compose service, which carries the keys `type`, `source` and `target`.
 *
 * @param entry Entry of the block `volumes`
 * @param composeServiceName Name of the compose service the entry belongs to
 *
 * @returns The mount of the named volume, or `null` when the entry declares anything else than a named volume
 */
function readLongEntry(entry: Record<string, unknown>, composeServiceName: string): ComposeMountEntry | null {
    const { type, source, target, read_only: readOnly } = entry as {
        type?: unknown;
        source?: unknown;
        target?: unknown;
        read_only?: unknown;
    };

    if (typeof source !== 'string' || typeof target !== 'string') {
        return null;
    }

    if (type === undefined ? isBindMountSource(source) : type !== 'volume') {
        return null;
    }

    return { daemonKey: source, mount: { composeServiceName, containerPath: target, readOnly: readOnly === true } };
}

/**
 * Reads every named volume the block `volumes` of one compose service mounts.
 *
 * @param composeServiceName Name of the compose service
 * @param composeService Compose service of the recipe
 *
 * @returns The mounts of the named volumes of that compose service
 */
function readServiceMounts(composeServiceName: string, composeService: unknown): ComposeMountEntry[] {
    if (typeof composeService !== 'object' || composeService === null) {
        return [];
    }

    const entries = (composeService as { volumes?: unknown }).volumes;

    if (!Array.isArray(entries)) {
        return [];
    }

    return entries.flatMap<ComposeMountEntry>((entry: unknown) => {
        if (typeof entry === 'string') {
            const read = readShortEntry(entry, composeServiceName);

            return read ? [read] : [];
        }

        if (typeof entry !== 'object' || entry === null) {
            return [];
        }

        const read = readLongEntry(entry as Record<string, unknown>, composeServiceName);

        return read ? [read] : [];
    });
}

/**
 * Reads the keys of the top-level block `volumes` of a compose file, which are the named volumes of the stack.
 *
 * @param document Document of the compose file
 *
 * @returns Key of every named volume the compose file declares
 */
function readDeclaredKeys(document: object): string[] {
    const volumes = (document as { volumes?: unknown }).volumes;

    if (typeof volumes !== 'object' || volumes === null || Array.isArray(volumes)) {
        return [];
    }

    return Object.keys(volumes);
}

/**
 * Use case that reads the named volumes of a compose file, and the mount each one takes inside the stack.
 *
 * @param text Text of the compose file
 *
 * @returns Every named volume the compose file declares. A volume that two compose services mount keeps the first mount alone
 *
 * @throws {Error} When the text is no valid YAML
 */
export function parseComposeVolumesUseCase(text: string): ComposeVolumeDeclaration[] {
    const document: unknown = parse(text);

    if (typeof document !== 'object' || document === null) {
        return [];
    }

    const declarations = new Map<string, ComposeVolumeDeclaration>(
        readDeclaredKeys(document).map((daemonKey) => [daemonKey, { daemonKey, mount: null }]),
    );

    const services = (document as { services?: unknown }).services;
    const composeServices = typeof services === 'object' && services !== null ? Object.entries(services) : [];

    for (const [composeServiceName, composeService] of composeServices) {
        for (const entry of readServiceMounts(composeServiceName, composeService)) {
            // The join of the database holds one mount for one volume, so the first service that mounts it wins.
            if (declarations.get(entry.daemonKey)?.mount) {
                continue;
            }

            declarations.set(entry.daemonKey, { daemonKey: entry.daemonKey, mount: entry.mount });
        }
    }

    return [...declarations.values()];
}
