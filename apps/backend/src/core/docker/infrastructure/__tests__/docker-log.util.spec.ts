import { decodeDockerLogBuffer, toLogLines } from '../docker-log.util';

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
