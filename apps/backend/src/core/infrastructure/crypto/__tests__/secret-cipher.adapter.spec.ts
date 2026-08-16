/* eslint-disable no-secrets/no-secrets */
import { SecretCipherAdapter } from '../secret-cipher.adapter';

/**
 * Name of the environment variable that carries the key of the encryption.
 */
const KEY_VARIABLE = 'PROVIDERS_ENCRYPTION_KEY';

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
