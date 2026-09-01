/**
 * Byte length of Docker's stream-multiplexing frame header.
 */
const HEADER_SIZE = 8;

/**
 * Stream-type byte values Docker uses in a multiplexed log frame header.
 */
const STREAM_TYPES = new Set([0, 1, 2]);

/**
 * Stream-type byte the daemon writes on the header of a frame of `stderr`.
 */
const STDERR_STREAM_TYPE = 2;

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

/**
 * One frame of the output of a container: the stream it was written to, and its text.
 */
export interface DockerLogFrame {
    source: 'stdout' | 'stderr';
    text: string;
}

/**
 * The frames a buffer holds, and the bytes of an incomplete frame that trail them.
 */
export interface DockerLogFrames {
    frames: DockerLogFrame[];
    rest: Buffer;
}

/**
 * Decodes a Docker log payload into plain text.
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
 * Splits a Docker log buffer into its frames, keeping the stream each frame was written to.
 *
 * @param buffer Raw log buffer as the daemon writes it
 *
 * @returns The complete frames of the buffer, and the trailing bytes of an incomplete one
 */
export function decodeDockerLogFrames(buffer: Buffer): DockerLogFrames {
    if (!isMultiplexed(buffer)) {
        return { frames: buffer.length > 0 ? [{ source: 'stdout', text: buffer.toString('utf8') }] : [], rest: Buffer.alloc(0) };
    }

    const frames: DockerLogFrame[] = [];
    let offset = 0;

    while (offset + HEADER_SIZE <= buffer.length) {
        const payloadSize = buffer.readUInt32BE(offset + 4);
        const start = offset + HEADER_SIZE;
        const end = start + payloadSize;

        if (end > buffer.length) {
            break;
        }

        frames.push({
            // eslint-disable-next-line security/detect-object-injection
            source: buffer[offset] === STDERR_STREAM_TYPE ? 'stderr' : 'stdout',
            text: buffer.toString('utf8', start, end),
        });
        offset = end;
    }

    return { frames, rest: buffer.subarray(offset) };
}
