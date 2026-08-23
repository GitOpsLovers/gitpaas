/* eslint-disable no-secrets/no-secrets */
import {
    ProviderAppOwnerType,
    ProviderRegistration,
    ProviderRegistrationConversion,
    ProviderRegistrationStep,
} from '../../../domain/models/provider-registration.models';
import { DbProviderRegistrationEntity } from '../db-provider-registration.entity';
import {
    SealedProviderRegistrationConversion,
    toProviderRegistration,
    toSealedProviderRegistrationConversion,
} from '../db-provider-registrations.transformer';

import { SecretCipherAdapter } from '@core/infrastructure/crypto/secret-cipher.adapter';

/**
 * The cipher the transformer and the fixtures seal and open the keys with.
 */
const cipher = new SecretCipherAdapter();

/**
 * Name of the environment variable that carries the key of the encryption.
 */
const KEY_VARIABLE = 'SECRETS_ENCRYPTION_KEY';

/**
 * A key of 32 bytes in the hexadecimal form, as the environment must hold it.
 */
const KEY = 'a'.repeat(64);

/**
 * A private key in the PEM form, as GitHub answers the conversion with.
 */
const PEM = ['-----BEGIN RSA PRIVATE KEY-----', 'MIIEowIBAAKCAQEAx0Vb+7uP', '-----END RSA PRIVATE KEY-----'].join(
    '\n',
);

/**
 * Builds a pending registration database-entity fixture, overriding only the fields under test.
 */
const registrationEntity = (overrides: Partial<DbProviderRegistrationEntity> = {}): DbProviderRegistrationEntity => ({
    id: 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d',
    state: 'f'.repeat(64),
    name: 'acme',
    ownerType: ProviderAppOwnerType.Personal,
    ownerLogin: null,
    step: ProviderRegistrationStep.AwaitingCreation,
    appId: null,
    appSlug: null,
    encryptedPrivateKey: null,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    expiresAt: new Date('2026-01-01T12:00:00.000Z'),
    ...overrides,
});

/**
 * The configuration of the application GitHub answers the conversion with.
 */
const conversion = (overrides: Partial<ProviderRegistrationConversion> = {}): ProviderRegistrationConversion => ({
    appId: '123456',
    appSlug: 'gitpaas-acme',
    privateKey: PEM,
    ...overrides,
});

describe('db-provider-registrations.transformer', () => {
    // eslint-disable-next-line security/detect-object-injection
    const originalKey = process.env[KEY_VARIABLE];

    beforeAll(() => {
        // eslint-disable-next-line security/detect-object-injection
        process.env[KEY_VARIABLE] = KEY;
    });

    afterAll(() => {
        if (originalKey === undefined) {
            Reflect.deleteProperty(process.env, KEY_VARIABLE);
        } else {
            // eslint-disable-next-line security/detect-object-injection
            process.env[KEY_VARIABLE] = originalKey;
        }
    });

    describe('toProviderRegistration', () => {
        it('maps every field of a row at the step awaiting_creation, which holds no application value', () => {
            const entity = registrationEntity();

            expect(toProviderRegistration(entity)).toEqual<ProviderRegistration>({
                id: entity.id,
                state: entity.state,
                name: 'acme',
                ownerType: ProviderAppOwnerType.Personal,
                ownerLogin: null,
                step: ProviderRegistrationStep.AwaitingCreation,
                appId: null,
                appSlug: null,
                encryptedPrivateKey: null,
                createdAt: entity.createdAt,
                expiresAt: entity.expiresAt,
            });
        });

        it('maps every field of a row at the step awaiting_installation, with the sealed key', () => {
            const sealed = cipher.encryptSecret(PEM);
            const entity = registrationEntity({
                step: ProviderRegistrationStep.AwaitingInstallation,
                ownerType: ProviderAppOwnerType.Organization,
                ownerLogin: 'gitopslovers',
                appId: '123456',
                appSlug: 'gitpaas-acme',
                encryptedPrivateKey: sealed,
            });

            expect(toProviderRegistration(entity)).toEqual<ProviderRegistration>({
                id: entity.id,
                state: entity.state,
                name: 'acme',
                ownerType: ProviderAppOwnerType.Organization,
                ownerLogin: 'gitopslovers',
                step: ProviderRegistrationStep.AwaitingInstallation,
                appId: '123456',
                appSlug: 'gitpaas-acme',
                encryptedPrivateKey: sealed,
                createdAt: entity.createdAt,
                expiresAt: entity.expiresAt,
            });
        });

        it('gives a copy of the row, and never the row itself', () => {
            const entity = registrationEntity();

            expect(toProviderRegistration(entity)).not.toBe(entity);
        });

        it('never carries the clear private key of a row that holds a sealed one', () => {
            const entity = registrationEntity({
                step: ProviderRegistrationStep.AwaitingInstallation,
                encryptedPrivateKey: cipher.encryptSecret(PEM),
            });

            const result = toProviderRegistration(entity);

            expect(result).not.toHaveProperty('privateKey');
            expect(JSON.stringify(result)).not.toContain('BEGIN RSA PRIVATE KEY');
            expect(JSON.stringify(result)).not.toContain(PEM.split('\n')[1]);
        });
    });

    describe('toSealedProviderRegistrationConversion', () => {
        it('maps the identifier and the short name of the application into the columns of the row', () => {
            const result = toSealedProviderRegistrationConversion(cipher, conversion());

            expect(result.appId).toBe('123456');
            expect(result.appSlug).toBe('gitpaas-acme');
        });

        it('seals the private key with the cipher, and gives the sealed payload', () => {
            const mockCipher: jest.Mocked<Pick<SecretCipherAdapter, 'encryptSecret'>> = {
                encryptSecret: jest.fn().mockReturnValue('iv:tag:cipher'),
            };

            const result = toSealedProviderRegistrationConversion(mockCipher as unknown as SecretCipherAdapter, conversion());

            expect(mockCipher.encryptSecret).toHaveBeenCalledTimes(1);
            expect(mockCipher.encryptSecret).toHaveBeenCalledWith(PEM);
            expect(result).toEqual<SealedProviderRegistrationConversion>({
                appId: '123456',
                appSlug: 'gitpaas-acme',
                encryptedPrivateKey: 'iv:tag:cipher',
            });
        });

        it('gives a sealed key the cipher opens back into the clear PEM', () => {
            const result = toSealedProviderRegistrationConversion(cipher, conversion());

            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            expect(cipher.decryptSecret(result.encryptedPrivateKey!)).toBe(PEM);
        });

        it('never lets the clear PEM reach the columns of the row', () => {
            const result = toSealedProviderRegistrationConversion(cipher, conversion());

            expect(result).not.toHaveProperty('privateKey');
            expect(result.encryptedPrivateKey).not.toBe(PEM);
            expect(JSON.stringify(result)).not.toContain('BEGIN RSA PRIVATE KEY');
            expect(JSON.stringify(result)).not.toContain(PEM.split('\n')[1]);
        });

        it('seals two conversions of the same PEM under distinct payloads', () => {
            const first = toSealedProviderRegistrationConversion(cipher, conversion());
            const second = toSealedProviderRegistrationConversion(cipher, conversion());

            expect(first.encryptedPrivateKey).not.toBe(second.encryptedPrivateKey);
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            expect(cipher.decryptSecret(second.encryptedPrivateKey!)).toBe(PEM);
        });
    });
});
