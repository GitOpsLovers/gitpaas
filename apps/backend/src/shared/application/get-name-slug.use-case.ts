/**
 * Convert a name into the one segment `[a-z0-9_]` that the name of a compose project accepts.
 *
 * @param name Name to convert
 *
 * @returns Segment of the name, or the empty text when the name holds no usable character
 */
export function getNameSlug(name: string): string {
    return name.toLowerCase().replace(/[^\da-z]+/g, '_').replace(/^_+|_+$/g, '');
}
