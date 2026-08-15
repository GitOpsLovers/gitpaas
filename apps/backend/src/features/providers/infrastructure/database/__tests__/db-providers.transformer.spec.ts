import { createHash } from 'node:crypto';

import { ProviderType } from '../../../domain/models/provider.models';
import { DbProviderEntity } from '../db-provider.entity';
import { toProvider, toProviderCredentials } from '../db-providers.transformer';

import { SecretCipherAdapter } from '@core/infrastructure/crypto/secret-cipher.adapter';

/**
 * The cipher the transformer and the fixtures seal and open the keys with.
 */
const cipher = new SecretCipherAdapter();

/**
 * Name of the environment variable that carries the key of the encryption.
 */
const KEY_VARIABLE = 'PROVIDERS_ENCRYPTION_KEY';

/**
 * A key of 32 bytes in the hexadecimal form, as the environment must hold it.
 */
const KEY = 'c'.repeat(64);

/**
 * A private key in the PEM form, as an operator pastes it.
 */
const PEM = ['-----BEGIN RSA PRIVATE KEY-----', 'MIIEowIBAAKCAQEAx0Vb+7uP', '-----END RSA PRIVATE KEY-----'].join(
    '\n',
);

/**
 * The expected fingerprint: the first eight characters of the SHA-256 of the PEM.
 */
const FINGERPRINT = createHash('sha256').update(PEM).digest('hex').slice(0, 8);

/**
 * Builds a provider database-entity fixture, overriding only the fields under test.
 */
const providerEntity = (overrides: Partial<DbProviderEntity> = {}): DbProviderEntity => ({
    id: 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d',
    name: 'acme',
    type: ProviderType.GithubApp,
    appId: '123456',
    installationId: '654321',
    encryptedPrivateKey: cipher.encryptSecret(PEM),
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-02T00:00:00.000Z'),
    ...overrides,
});

describe('db-providers.transformer', () => {
    const originalKey = process.env[KEY_VARIABLE];

    beforeAll(() => {
        process.env[KEY_VARIABLE] = KEY;
    });

    afterAll(() => {
        if (originalKey === undefined) {
            delete process.env[KEY_VARIABLE];
        } else {
            process.env[KEY_VARIABLE] = originalKey;
        }
    });

    describe('toProvider', () => {
        it('maps every entity field into the domain provider', () => {
            const entity = providerEntity();

            expect(toProvider(cipher, entity)).toEqual({
                id: entity.id,
                name: 'acme',
                type: ProviderType.GithubApp,
                appId: '123456',
                installationId: '654321',
                keyFingerprint: FINGERPRINT,
                createdAt: entity.createdAt,
                updatedAt: entity.updatedAt,
            });
        });

        it('gives the first eight characters of the SHA-256 of the PEM as the fingerprint', () => {
            const result = toProvider(cipher, providerEntity());

            expect(result.keyFingerprint).toBe(FINGERPRINT);
            expect(result.keyFingerprint).toHaveLength(8);
        });

        it('gives the same fingerprint for two rows that seal the same PEM under distinct vectors', () => {
            const first = toProvider(cipher, providerEntity({ encryptedPrivateKey: cipher.encryptSecret(PEM) }));
            const second = toProvider(cipher, providerEntity({ encryptedPrivateKey: cipher.encryptSecret(PEM) }));

            expect(first.keyFingerprint).toBe(second.keyFingerprint);
        });

        it('gives distinct fingerprints for two distinct PEMs', () => {
            const other = toProvider(
                cipher,
                providerEntity({ encryptedPrivateKey: cipher.encryptSecret('another-key') }),
            );

            expect(other.keyFingerprint).not.toBe(FINGERPRINT);
        });

        it('never carries the private key, in the clear form or in the sealed form', () => {
            const entity = providerEntity();
            const result = toProvider(cipher, entity);

            expect(result).not.toHaveProperty('privateKey');
            expect(result).not.toHaveProperty('encryptedPrivateKey');
            expect(JSON.stringify(result)).not.toContain('BEGIN RSA PRIVATE KEY');
            expect(JSON.stringify(result)).not.toContain(entity.encryptedPrivateKey);
        });

        it('gives an empty fingerprint when the stored key cannot be opened', () => {
            const result = toProvider(cipher, providerEntity({ encryptedPrivateKey: 'not-a-sealed-payload' }));

            expect(result.keyFingerprint).toBe('');
        });

        it('gives an empty fingerprint when the key of the encryption does not open the row', () => {
            const entity = providerEntity();
            process.env[KEY_VARIABLE] = 'd'.repeat(64);

            const result = toProvider(cipher, entity);
            process.env[KEY_VARIABLE] = KEY;

            expect(result.keyFingerprint).toBe('');
        });
    });

    describe('toProviderCredentials', () => {
        it('maps the entity into the credentials, opening the private key', () => {
            const entity = providerEntity();

            expect(toProviderCredentials(cipher, entity)).toEqual({
                providerId: entity.id,
                appId: '123456',
                installationId: '654321',
                privateKey: PEM,
            });
        });

        it('never carries the fingerprint or the sealed key', () => {
            const result = toProviderCredentials(cipher, providerEntity());

            expect(result).not.toHaveProperty('keyFingerprint');
            expect(result).not.toHaveProperty('encryptedPrivateKey');
        });

        it('throws when the stored key cannot be opened', () => {
            expect(() =>
                toProviderCredentials(cipher, providerEntity({ encryptedPrivateKey: 'not-a-sealed-payload' })),
            ).toThrow('The sealed payload is malformed');
        });
    });
});
