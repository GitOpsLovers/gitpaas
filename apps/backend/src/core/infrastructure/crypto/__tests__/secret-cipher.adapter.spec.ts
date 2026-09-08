/* eslint-disable no-secrets/no-secrets */
import { SecretCipherAdapter } from '../secret-cipher.adapter';

/**
 * Name of the environment variable that carries the key of the encryption.
 */
const KEY_VARIABLE = 'SECRETS_ENCRYPTION_KEY';

/**
 * A key of 32 bytes in the hexadecimal form, as the environment must hold it.
 */
const KEY = 'a'.repeat(64);

/**
 * A second key of 32 bytes, used to prove that a wrong key opens nothing.
 */
const OTHER_KEY = 'b'.repeat(64);

/**
 * A private key in the PEM form, as an operator pastes it.
 */
const PEM = ['-----BEGIN RSA PRIVATE KEY-----', 'MIIEowIBAAKCAQEAx0Vb+7uP', '-----END RSA PRIVATE KEY-----'].join(
    '\n',
);

/**
 * Identifier of the row that holds the secret, which the seal binds the payload to.
 */
const ROW_ID = '3f2504e0-4f89-41d3-9a0c-0305e82c3301';

/**
 * Identifier of another row, used to prove that a payload does not travel.
 */
const OTHER_ROW_ID = '9c858901-8a57-4791-81fe-4c455b099bc9';

describe('SecretCipherAdapter', () => {
    // eslint-disable-next-line security/detect-object-injection
    const originalKey = process.env[KEY_VARIABLE];

    let sut: SecretCipherAdapter;

    beforeEach(() => {
        jest.clearAllMocks();
        // eslint-disable-next-line security/detect-object-injection
        process.env[KEY_VARIABLE] = KEY;
        sut = new SecretCipherAdapter();
    });

    afterAll(() => {
        if (originalKey === undefined) {
            Reflect.deleteProperty(process.env, KEY_VARIABLE);
        } else {
            // eslint-disable-next-line security/detect-object-injection
            process.env[KEY_VARIABLE] = originalKey;
        }
    });

    describe('the round trip', () => {
        it('returns the clear text a sealed payload was built from', () => {
            expect(sut.decryptSecret(sut.encryptSecret(PEM))).toBe(PEM);
        });

        it('returns an empty clear text unchanged', () => {
            expect(sut.decryptSecret(sut.encryptSecret(''))).toBe('');
        });

        it('preserves a clear text made of characters outside the ASCII range', () => {
            const plainText = 'clé-privée-🔐';

            expect(sut.decryptSecret(sut.encryptSecret(plainText))).toBe(plainText);
        });

        it('never carries the clear text inside the sealed payload', () => {
            expect(sut.encryptSecret(PEM)).not.toContain('BEGIN RSA PRIVATE KEY');
        });

        it('seals the payload as three hexadecimal parts separated by a colon', () => {
            const parts = sut.encryptSecret(PEM).split(':');

            expect(parts).toHaveLength(3);
            parts.forEach((part) => {
                expect(part).toMatch(/^[\da-f]+$/);
            });
        });
    });

    describe('when the key of the decryption is wrong', () => {
        it('throws instead of returning the clear text', () => {
            const payload = sut.encryptSecret(PEM);
            // eslint-disable-next-line security/detect-object-injection
            process.env[KEY_VARIABLE] = OTHER_KEY;

            expect(() => sut.decryptSecret(payload)).toThrow();
        });

        it('throws when the sealed payload does not hold three parts', () => {
            expect(() => sut.decryptSecret('not-a-sealed-payload')).toThrow('The sealed payload is malformed');
        });

        it('throws when the variable of the encryption is absent', () => {
            Reflect.deleteProperty(process.env, KEY_VARIABLE);

            expect(() => sut.encryptSecret(PEM)).toThrow(`${KEY_VARIABLE} is not set`);
        });

        it('throws when the variable does not hold 32 bytes in the hexadecimal form', () => {
            // eslint-disable-next-line security/detect-object-injection
            process.env[KEY_VARIABLE] = 'abcd';

            expect(() => sut.encryptSecret(PEM)).toThrow(
                `${KEY_VARIABLE} must hold 32 bytes in the hexadecimal form`,
            );
        });

        it('reads the key on every call, so a change of the variable takes effect at once', () => {
            const first = sut.encryptSecret(PEM);
            // eslint-disable-next-line security/detect-object-injection
            process.env[KEY_VARIABLE] = OTHER_KEY;
            const second = sut.encryptSecret(PEM);

            expect(sut.decryptSecret(second)).toBe(PEM);
            // eslint-disable-next-line security/detect-object-injection
            process.env[KEY_VARIABLE] = KEY;
            expect(sut.decryptSecret(first)).toBe(PEM);
        });
    });

    describe('the binding to the row', () => {
        it('returns the clear text when the same identifier opens the payload', () => {
            expect(sut.decryptSecret(sut.encryptSecret(PEM, ROW_ID), ROW_ID)).toBe(PEM);
        });

        it('marks the bound payload with the prefix v2 and four parts', () => {
            const parts = sut.encryptSecret(PEM, ROW_ID).split(':');

            expect(parts).toHaveLength(4);
            expect(parts[0]).toBe('v2');
        });

        it('throws when the payload is opened with the identifier of another row', () => {
            const payload = sut.encryptSecret(PEM, ROW_ID);

            expect(() => sut.decryptSecret(payload, OTHER_ROW_ID)).toThrow();
        });

        it('throws when a bound payload is opened with no identifier at all', () => {
            const payload = sut.encryptSecret(PEM, ROW_ID);

            expect(() => sut.decryptSecret(payload)).toThrow(
                'The sealed payload is bound to a row, and no identifier was given',
            );
        });

        it('never seals the same clear text of two rows into the same payload', () => {
            expect(sut.encryptSecret(PEM, ROW_ID)).not.toBe(sut.encryptSecret(PEM, OTHER_ROW_ID));
        });

        it('opens a payload sealed before the binding existed, and ignores the identifier', () => {
            const legacy = sut.encryptSecret(PEM);

            expect(legacy.split(':')).toHaveLength(3);
            expect(sut.decryptSecret(legacy, ROW_ID)).toBe(PEM);
        });

        it('throws when the payload holds four parts without the marker of the binding', () => {
            expect(() => sut.decryptSecret('v9:aa:bb:cc', ROW_ID)).toThrow('The sealed payload is malformed');
        });
    });

    describe('when the same clear text is sealed twice', () => {
        it('gives two distinct payloads, since a fresh vector is drawn per call', () => {
            expect(sut.encryptSecret(PEM)).not.toBe(sut.encryptSecret(PEM));
        });

        it('gives two distinct initialisation vectors', () => {
            const [firstIv] = sut.encryptSecret(PEM).split(':');
            const [secondIv] = sut.encryptSecret(PEM).split(':');

            expect(firstIv).not.toBe(secondIv);
        });

        it('opens both payloads back to the same clear text', () => {
            const first = sut.encryptSecret(PEM);
            const second = sut.encryptSecret(PEM);

            expect(sut.decryptSecret(first)).toBe(PEM);
            expect(sut.decryptSecret(second)).toBe(PEM);
        });
    });
});
