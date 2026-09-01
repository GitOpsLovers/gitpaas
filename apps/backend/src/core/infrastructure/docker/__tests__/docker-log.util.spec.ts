import { decodeDockerLogBuffer, decodeDockerLogFrames, toLogLines } from '../docker-log.util';

/**
 * Builds a Docker multiplexed log frame: `[stream, 0, 0, 0, size(4 BE)] + payload`.
 *
 * @param stream Stream type byte (1 = stdout, 2 = stderr)
 * @param payload Frame payload
 */
function frame(stream: number, payload: string): Buffer {
    const body = Buffer.from(payload, 'utf8');
    const header = Buffer.alloc(8);

    header[0] = stream;
    header.writeUInt32BE(body.length, 4);

    return Buffer.concat([header, body]);
}

describe('decodeDockerLogBuffer', () => {
    it('strips frame headers from multiplexed (non-TTY) output', () => {
        const buffer = Buffer.concat([frame(1, 'hello\n'), frame(2, 'oops\n')]);

        expect(decodeDockerLogBuffer(buffer)).toBe('hello\noops\n');
    });

    it('returns raw text for TTY output that has no frame headers', () => {
        const buffer = Buffer.from('plain tty line\n', 'utf8');

        expect(decodeDockerLogBuffer(buffer)).toBe('plain tty line\n');
    });

    it('stops cleanly on a truncated trailing frame', () => {
        const truncated = Buffer.concat([frame(1, 'complete\n'), Buffer.from([1, 0, 0, 0])]);

        expect(decodeDockerLogBuffer(truncated)).toBe('complete\n');
    });
});

describe('toLogLines', () => {
    it('splits into non-empty lines and trims carriage returns', () => {
        expect(toLogLines('a\r\nb\n\nc\n')).toEqual(['a', 'b', 'c']);
    });

    it('returns an empty array for empty input', () => {
        expect(toLogLines('')).toEqual([]);
    });
});

describe('decodeDockerLogFrames', () => {
    it('keeps the stream each frame of a multiplexed buffer was written to', () => {
        const buffer = Buffer.concat([frame(1, 'hello\n'), frame(2, 'oops\n')]);

        expect(decodeDockerLogFrames(buffer)).toEqual({
            frames: [{ source: 'stdout', text: 'hello\n' }, { source: 'stderr', text: 'oops\n' }],
            rest: Buffer.alloc(0),
        });
    });

    it('returns the bytes of a truncated trailing frame as the rest', () => {
        const truncated = Buffer.from([1, 0, 0, 0]);
        const buffer = Buffer.concat([frame(1, 'complete\n'), truncated]);

        expect(decodeDockerLogFrames(buffer)).toEqual({
            frames: [{ source: 'stdout', text: 'complete\n' }],
            rest: truncated,
        });
    });

    it('returns the bytes of a frame whose payload is not complete yet as the rest', () => {
        const buffer = frame(1, 'half\n').subarray(0, 10);

        expect(decodeDockerLogFrames(buffer)).toEqual({ frames: [], rest: buffer });
    });

    it('reads a TTY buffer as a single frame of stdout', () => {
        const buffer = Buffer.from('plain tty line\n', 'utf8');

        expect(decodeDockerLogFrames(buffer)).toEqual({
            frames: [{ source: 'stdout', text: 'plain tty line\n' }],
            rest: Buffer.alloc(0),
        });
    });

    it('returns no frame for an empty buffer', () => {
        expect(decodeDockerLogFrames(Buffer.alloc(0))).toEqual({ frames: [], rest: Buffer.alloc(0) });
    });
});
