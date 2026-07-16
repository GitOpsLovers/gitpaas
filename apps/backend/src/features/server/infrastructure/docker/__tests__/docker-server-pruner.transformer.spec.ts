import { toPruneResult } from '../docker-server-pruner.transformer';

describe('toPruneResult', () => {
    it('counts the deleted resources and passes through the reclaimed space', () => {
        expect(toPruneResult(['a', 'b', 'c'], 2048)).toEqual({
            deletedCount: 3,
            spaceReclaimed: 2048,
        });
    });

    it('defaults deletedCount to 0 when deleted is null', () => {
        expect(toPruneResult(null, 512)).toEqual({ deletedCount: 0, spaceReclaimed: 512 });
    });

    it('defaults deletedCount to 0 when deleted is undefined', () => {
        expect(toPruneResult(undefined, 512)).toEqual({ deletedCount: 0, spaceReclaimed: 512 });
    });

    it('defaults spaceReclaimed to 0 when it is null or undefined', () => {
        expect(toPruneResult([], null)).toEqual({ deletedCount: 0, spaceReclaimed: 0 });
        expect(toPruneResult([], undefined)).toEqual({ deletedCount: 0, spaceReclaimed: 0 });
    });

    it('returns zeroed counters for a fully empty prune response', () => {
        expect(toPruneResult([], 0)).toEqual({ deletedCount: 0, spaceReclaimed: 0 });
    });
});
