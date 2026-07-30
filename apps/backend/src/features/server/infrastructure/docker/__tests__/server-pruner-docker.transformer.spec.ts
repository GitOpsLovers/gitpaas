import { toPruneResult } from '../server-pruner-docker.transformer';

describe('toPruneResult', () => {
    it('carries the deleted count and the reclaimed space over to the domain model', () => {
        expect(toPruneResult({ deletedCount: 3, spaceReclaimed: 2048 })).toEqual({
            deletedCount: 3,
            spaceReclaimed: 2048,
        });
    });

    it('returns zeroed counters for a zeroed prune report', () => {
        expect(toPruneResult({ deletedCount: 0, spaceReclaimed: 0 })).toEqual({ deletedCount: 0, spaceReclaimed: 0 });
    });

    it('never leaks the report itself, so a later mutation cannot alter the result', () => {
        const report = { deletedCount: 1, spaceReclaimed: 512 };

        const result = toPruneResult(report);
        report.deletedCount = 99;

        expect(result).toEqual({ deletedCount: 1, spaceReclaimed: 512 });
    });
});
