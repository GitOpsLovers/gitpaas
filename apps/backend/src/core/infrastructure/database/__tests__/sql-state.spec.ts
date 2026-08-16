import { FOREIGN_KEY_VIOLATION, UNIQUE_VIOLATION, readSqlState } from '../sql-state';

describe('readSqlState', () => {
    /** Failures carrying a readable SQLSTATE, with the state each one must yield. */
    const readableFailures: Array<[string, unknown, string]> = [
        ['a driver failure carrying the SQLSTATE at its top level', { code: '23505' }, '23505'],
        ['a TypeORM QueryFailedError wrapping the driver failure', { driverError: { code: '23503' } }, '23503'],
        [
            'a wrapper whose driverError SQLSTATE wins over its own code',
            { code: '23503', driverError: { code: '23505' } },
            '23505',
        ],
    ];

    /** Failures carrying no readable SQLSTATE. */
    const unreadableFailures: Array<[string, unknown]> = [
        ['a numeric code, since only a string SQLSTATE is read', { code: 23505 }],
        ['a wrapper whose driverError code is not a string', { driverError: { code: 23505 } }],
        ['a null throw', null],
        ['an undefined throw', undefined],
        ['a thrown string', 'boom'],
        ['an object with no code at all', {}],
        ['an Error with no code at all', new Error('connection terminated')],
    ];

    it.each(readableFailures)('reads the SQLSTATE of %s', (_case, error, expected) => {
        expect(readSqlState(error)).toBe(expected);
    });

    it.each(unreadableFailures)('returns undefined for %s', (_case, error) => {
        expect(readSqlState(error)).toBeUndefined();
    });

    it('falls back to the top-level code when the wrapper carries no driverError code', () => {
        expect(readSqlState({ code: '23505', driverError: {} })).toBe('23505');
    });

    it('reads any SQLSTATE string, not only the ones the constants name', () => {
        expect(readSqlState({ code: '23502' })).toBe('23502');
    });
});

describe('SQLSTATE constants', () => {
    it('names the PostgreSQL unique violation SQLSTATE', () => {
        expect(UNIQUE_VIOLATION).toBe('23505');
    });

    it('names the PostgreSQL foreign-key violation SQLSTATE', () => {
        expect(FOREIGN_KEY_VIOLATION).toBe('23503');
    });
});
