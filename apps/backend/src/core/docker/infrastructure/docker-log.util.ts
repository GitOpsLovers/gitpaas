/** Byte length of Docker's stream-multiplexing frame header. */
const HEADER_SIZE = 8;

/** Stream-type byte values Docker uses in a multiplexed log frame header. */
const STREAM_TYPES = new Set([0, 1, 2]);

/**
 * Decodes a Docker log payload into plain text.
 *
 * When a container has no TTY, the daemon multiplexes stdout/stderr into frames
 * prefixed with an 8-byte header (`[stream, 0, 0, 0, size(4, big-endian)]`).
 * TTY containers emit raw text with no header. This strips frame headers when
 * present and returns the concatenated payload.
 *
 * @param buffer Raw log buffer as returned by `container.logs({ follow: false })`
 *
 * @returns The decoded log text
 */
export function decodeDockerLogBuffer(buffer: Buffer): string {
    if (!isMultiplexed(buffer)) {
        return buffer.toString('utf8');
    }

    const chunks: string[] = [];
    let offset = 0;

    while (offset + HEADER_SIZE <= buffer.length) {
        const payloadSize = buffer.readUInt32BE(offset + 4);
        const start = offset + HEADER_SIZE;
        const end = start + payloadSize;

        if (end > buffer.length) {
            break;
        }

        chunks.push(buffer.toString('utf8', start, end));
        offset = end;
    }

    return chunks.join('');
}

/**
 * Splits log text into non-empty lines with trailing carriage returns removed.
 *
 * @param text Log text
 *
 * @returns Array of clean, non-empty lines
 */
export function toLogLines(text: string): string[] {
    return text
        .split('\n')
        .map((line) => line.replace(/\r$/, ''))
        .filter((line) => line.length > 0);
}

/**
 * Heuristically detects whether a log buffer is multiplexed (non-TTY).
 *
 * A multiplexed frame starts with a known stream-type byte followed by three
 * zero bytes; raw TTY output effectively never matches this.
 *
 * @param buffer Raw log buffer
 */
function isMultiplexed(buffer: Buffer): boolean {
    if (buffer.length < HEADER_SIZE) {
        return false;
    }

    return STREAM_TYPES.has(buffer[0]) && buffer[1] === 0 && buffer[2] === 0 && buffer[3] === 0;
}
