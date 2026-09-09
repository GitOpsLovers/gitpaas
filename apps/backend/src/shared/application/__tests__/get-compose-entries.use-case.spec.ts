import { toEntryList, toEntryMap } from '../get-compose-entries.use-case';

describe('toEntryMap', () => {
    it('returns an empty map when the block is absent', () => {
        expect(toEntryMap()).toEqual({});
    });

    it('reads the list form KEY=value', () => {
        expect(toEntryMap(['LOG_LEVEL=debug', 'GREETING=hello=world'])).toEqual({ LOG_LEVEL: 'debug', GREETING: 'hello=world' });
    });

    it('gives an empty value to an entry of the list form that carries no separator', () => {
        expect(toEntryMap(['LOG_LEVEL'])).toEqual({ LOG_LEVEL: '' });
    });

    it('renders the value of the map form as its text', () => {
        expect(toEntryMap({ PORT: 8080, DEBUG: true })).toEqual({ PORT: '8080', DEBUG: 'true' });
    });

    it('returns a new map on each call', () => {
        const entries = { LOG_LEVEL: 'debug' };

        expect(toEntryMap(entries)).not.toBe(toEntryMap(entries));
    });
});

describe('toEntryList', () => {
    it('renders a map as the list form KEY=value', () => {
        expect(toEntryList({ LOG_LEVEL: 'debug', PORT: '8080' })).toEqual(['LOG_LEVEL=debug', 'PORT=8080']);
    });

    it('returns an empty list for an empty map', () => {
        expect(toEntryList({})).toEqual([]);
    });
});
