import { getNameSlug } from '../get-name-slug.use-case';

describe('get-name-slug.use-case', () => {
    describe('getNameSlug', () => {
        it.each([
            ['lowercases an uppercase name', 'CHECKOUT', 'checkout'],
            ['turns a run of other characters into one underscore', 'Web   //  App', 'web_app'],
            ['keeps an underscore as a separator', 'my_app', 'my_app'],
            ['treats a dash as a separator', 'billing-svc', 'billing_svc'],
            ['keeps a digit', 'api2 v3', 'api2_v3'],
            ['replaces a dot between two segments', 'v2.1 Release', 'v2_1_release'],
            ['drops a character outside ascii', 'Café', 'caf'],
            ['trims the underscores of both ends', '--Web App--', 'web_app'],
            ['leaves a name that is already a segment untouched', 'billing_svc', 'billing_svc'],
        ])('%s', (_case, name, expected) => {
            expect(getNameSlug(name)).toBe(expected);
        });

        it.each([
            ['punctuation only', '!!!'],
            ['whitespace only', '   '],
            ['empty', ''],
            ['non-ascii only', '日本語'],
        ])('gives the empty text when the name is %s', (_case, name) => {
            expect(getNameSlug(name)).toBe('');
        });

        it('never starts the segment with an underscore, so Docker accepts it', () => {
            expect(getNameSlug('   leading').startsWith('_')).toBe(false);
        });

        it('holds no character outside [a-z0-9_]', () => {
            // eslint-disable-next-line optimize-regex/optimize-regex
            expect(/^[\da-z_]*$/.test(getNameSlug('Ünïcode 42 // Naming!'))).toBe(true);
        });
    });
});
