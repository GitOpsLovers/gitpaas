import { RUNTIME_LOG_TAIL_MAX, runtimeLogContainerIdSchema, runtimeLogsQuerySchema } from '../runtime-log.contract';

const containerId = 'a1b2c3d4e5f6';

/** A query of the history of one container, satisfying every rule of `runtimeLogsQuerySchema`. */
const validQuery = (overrides: Record<string, unknown> = {}): Record<string, unknown> => ({
    containerId,
    ...overrides,
});

describe('runtimeLogContainerIdSchema', () => {
    it('accepts the short identifier of a container', () => {
        expect(runtimeLogContainerIdSchema.safeParse(containerId).success).toBe(true);
    });

    it('accepts the full identifier of a container', () => {
        expect(runtimeLogContainerIdSchema.safeParse('a'.repeat(64)).success).toBe(true);
    });

    it('rejects an identifier that is too short to name a container', () => {
        expect(runtimeLogContainerIdSchema.safeParse('a1b2c3').success).toBe(false);
    });

    it('rejects an identifier that is longer than the column of the database', () => {
        expect(runtimeLogContainerIdSchema.safeParse('a'.repeat(65)).success).toBe(false);
    });

    it('rejects an identifier that holds a character outside the hexadecimal form', () => {
        expect(runtimeLogContainerIdSchema.safeParse('z1b2c3d4e5f6').success).toBe(false);
    });
});

describe('runtimeLogsQuerySchema', () => {
    it('accepts a query that names the container alone', () => {
        expect(runtimeLogsQuerySchema.safeParse(validQuery()).success).toBe(true);
    });

    it('rejects a query with no container', () => {
        expect(runtimeLogsQuerySchema.safeParse({}).success).toBe(false);
    });

    it('turns the tail of the query, which arrives as a text, into a number', () => {
        const result = runtimeLogsQuerySchema.safeParse(validQuery({ tail: '100' }));

        expect(result.success).toBe(true);
        expect(result.data?.tail).toBe(100);
    });

    it('rejects a tail that is not a whole number', () => {
        expect(runtimeLogsQuerySchema.safeParse(validQuery({ tail: '1.5' })).success).toBe(false);
    });

    it('rejects a tail of no line', () => {
        expect(runtimeLogsQuerySchema.safeParse(validQuery({ tail: '0' })).success).toBe(false);
    });

    it('rejects a tail above the largest read', () => {
        expect(runtimeLogsQuerySchema.safeParse(validQuery({ tail: String(RUNTIME_LOG_TAIL_MAX + 1) })).success).toBe(false);
    });

    it('accepts a start of the read in the ISO form', () => {
        expect(runtimeLogsQuerySchema.safeParse(validQuery({ since: '2026-01-01T00:00:00.000Z' })).success).toBe(true);
    });

    it('rejects a start of the read that is no instant', () => {
        expect(runtimeLogsQuerySchema.safeParse(validQuery({ since: 'yesterday' })).success).toBe(false);
    });

    it('rejects a property the query does not declare', () => {
        expect(runtimeLogsQuerySchema.safeParse(validQuery({ follow: 'true' })).success).toBe(false);
    });
});
