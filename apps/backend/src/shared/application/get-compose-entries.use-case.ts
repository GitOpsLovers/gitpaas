/**
 * A block of `KEY=value` entries of a compose file, in either the list or the map form.
 */
export type ComposeEntries = string[] | Record<string, unknown>;

/**
 * Normalises a block of entries (list or map form) into a `{ key: value }` map.
 *
 * @param entries Compose labels or environment block, if any
 *
 * @returns Entries as a `{ key: value }` map
 */
export function toEntryMap(entries?: ComposeEntries): Record<string, string> {
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
export function toEntryList(entries: Record<string, string>): string[] {
    return Object.entries(entries).map(([key, value]) => `${key}=${value}`);
}
