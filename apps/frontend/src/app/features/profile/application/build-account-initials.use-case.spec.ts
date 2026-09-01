import { buildAccountInitialsUseCase } from './build-account-initials.use-case';

const EMAIL = 'ada.lovelace@gitpaas.dev';

describe('buildAccountInitialsUseCase', () => {
    test('takes the first letter of the first two words of the display name', () => {
        expect(buildAccountInitialsUseCase('Ada Lovelace', EMAIL)).toBe('AL');
    });

    test('stops at two letters when the display name holds more words', () => {
        expect(buildAccountInitialsUseCase('Ada Byron King Lovelace', EMAIL)).toBe('AB');
    });

    test('gives one letter when the display name holds one word', () => {
        expect(buildAccountInitialsUseCase('Ada', EMAIL)).toBe('A');
    });

    test('puts the letters in upper case', () => {
        expect(buildAccountInitialsUseCase('ada lovelace', EMAIL)).toBe('AL');
    });

    test.each([null, '', '   '])('falls back to the address when the display name is %o', (displayName) => {
        expect(buildAccountInitialsUseCase(displayName, EMAIL)).toBe('AL');
    });

    test.each(['ada-lovelace@gitpaas.dev', 'ada_lovelace@gitpaas.dev'])(
        'splits the local part of %s on its separator',
        (email) => {
            expect(buildAccountInitialsUseCase(null, email)).toBe('AL');
        },
    );

    test('gives one letter when the local part of the address holds one word', () => {
        expect(buildAccountInitialsUseCase(null, 'admin@gitpaas.dev')).toBe('A');
    });

    test('gives a question mark when neither the name nor the address carries a letter', () => {
        expect(buildAccountInitialsUseCase(null, '')).toBe('?');
    });
});
