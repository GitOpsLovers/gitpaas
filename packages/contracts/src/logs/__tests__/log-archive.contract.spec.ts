/* eslint-disable no-secrets/no-secrets */
import { archivedLogEntrySchema, deploymentLogArchiveSchema, logArchiveStateSchema } from '../log-archive.contract';

/** A single archived entry of a line, satisfying every rule of `archivedLogEntrySchema`. */
const validEntry = (overrides: Record<string, unknown> = {}): Record<string, unknown> => ({
    id: '9c858901-8a57-4791-81fe-4c455b099bc9',
    deploymentId: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
    seq: 1,
    createdAt: '2026-07-11T00:00:00.000Z',
    type: 'line',
    data: 'building…',
    ...overrides,
});

/**
 * A durable list of a deployment, satisfying every rule of `deploymentLogArchiveSchema`.
 */
const validArchive = (overrides: Record<string, unknown> = {}): Record<string, unknown> => ({
    state: 'available',
    entries: [validEntry()],
    ...overrides,
});

describe('logArchiveStateSchema', () => {
    it.each(['available', 'running', 'expired'])('accepts the state %s', (state) => {
        expect(logArchiveStateSchema.safeParse(state).success).toBe(true);
    });

    it('rejects a state outside the three cases', () => {
        expect(logArchiveStateSchema.safeParse('unknown').success).toBe(false);
    });
});

describe('archivedLogEntrySchema', () => {
    it('accepts a valid entry of a line', () => {
        expect(archivedLogEntrySchema.safeParse(validEntry()).success).toBe(true);
    });

    it('accepts a valid entry of the end', () => {
        expect(archivedLogEntrySchema.safeParse(validEntry({ type: 'end', status: 'success', data: undefined })).success).toBe(true);
    });

    it('rejects an id that is not a UUID', () => {
        expect(archivedLogEntrySchema.safeParse(validEntry({ id: 'not-a-uuid' })).success).toBe(false);
    });

    it('rejects a deploymentId that is not a UUID', () => {
        expect(archivedLogEntrySchema.safeParse(validEntry({ deploymentId: 'not-a-uuid' })).success).toBe(false);
    });

    it('rejects a createdAt that is not an ISO date', () => {
        expect(archivedLogEntrySchema.safeParse(validEntry({ createdAt: 'yesterday' })).success).toBe(false);
    });
});

describe('deploymentLogArchiveSchema', () => {
    it('accepts the deployment ended: a state of available with every archived entry', () => {
        const result = deploymentLogArchiveSchema.safeParse(
            validArchive({ state: 'available', entries: [validEntry(), validEntry({ seq: 2 })] }),
        );

        expect(result.success).toBe(true);
    });

    it('accepts the deployment still runs: a state of running with an empty list', () => {
        const result = deploymentLogArchiveSchema.safeParse(validArchive({ state: 'running', entries: [] }));

        expect(result.success).toBe(true);
    });

    it('accepts the output went away: a state of expired with an empty list', () => {
        const result = deploymentLogArchiveSchema.safeParse(validArchive({ state: 'expired', entries: [] }));

        expect(result.success).toBe(true);
    });

    it('rejects a state outside the three cases', () => {
        expect(deploymentLogArchiveSchema.safeParse(validArchive({ state: 'unknown' })).success).toBe(false);
    });

    it('rejects an archive with no state', () => {
        const { state: _state, ...withoutState } = validArchive();

        expect(deploymentLogArchiveSchema.safeParse(withoutState).success).toBe(false);
    });

    it('rejects an archive with no entries', () => {
        const { entries: _entries, ...withoutEntries } = validArchive();

        expect(deploymentLogArchiveSchema.safeParse(withoutEntries).success).toBe(false);
    });

    it('rejects an entry that fails the shape of an archived entry', () => {
        const result = deploymentLogArchiveSchema.safeParse(validArchive({ entries: [{ type: 'line' }] }));

        expect(result.success).toBe(false);
    });
});
