/* eslint-disable no-secrets/no-secrets */
import { FindOperator, LessThan, Repository } from 'typeorm';

import {
    NewProviderRegistration,
    ProviderAppOwnerType,
    ProviderRegistration,
    ProviderRegistrationConversion,
    ProviderRegistrationStep,
} from '../../../domain/models/provider-registration.models';
import { DbProviderRegistrationEntity } from '../db-provider-registration.entity';
import { DatabaseProviderRegistrationsRepository } from '../db-provider-registrations.repository';

import { SecretCipherAdapter } from '@core/infrastructure/crypto/secret-cipher.adapter';

/**
 * The cipher the repository and the fixtures seal and open the keys with.
 */
const cipher = new SecretCipherAdapter();

/**
 * Name of the environment variable that carries the key of the encryption.
 */
const KEY_VARIABLE = 'PROVIDERS_ENCRYPTION_KEY';

/**
 * A key of 32 bytes in the hexadecimal form, as the environment must hold it.
 */
const KEY = 'b'.repeat(64);

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
 * Builds the domain registration the transformer gives for a fixture entity.
 */
const domainRegistrationOf = (entity: DbProviderRegistrationEntity): ProviderRegistration => ({
    id: entity.id,
    state: entity.state,
    name: entity.name,
    ownerType: entity.ownerType,
    ownerLogin: entity.ownerLogin,
    step: entity.step,
    appId: entity.appId,
    appSlug: entity.appSlug,
    encryptedPrivateKey: entity.encryptedPrivateKey,
    createdAt: entity.createdAt,
    expiresAt: entity.expiresAt,
});

describe('DatabaseProviderRegistrationsRepository', () => {
    // eslint-disable-next-line security/detect-object-injection
    const originalKey = process.env[KEY_VARIABLE];

    const newRegistration: NewProviderRegistration = {
        state: 'f'.repeat(64),
        name: 'acme',
        ownerType: ProviderAppOwnerType.Personal,
        ownerLogin: null,
        expiresAt: new Date('2026-01-01T12:00:00.000Z'),
    };

    const conversion: ProviderRegistrationConversion = {
        appId: '123456',
        appSlug: 'gitpaas-acme',
        privateKey: PEM,
    };

    let mockRepository: jest.Mocked<
        Pick<Repository<DbProviderRegistrationEntity>, 'findOneBy' | 'create' | 'merge' | 'save' | 'delete'>
    >;
    let sut: DatabaseProviderRegistrationsRepository;

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

    beforeEach(() => {
        jest.clearAllMocks();

        mockRepository = {
            findOneBy: jest.fn(),
            create: jest.fn(),
            merge: jest.fn(),
            save: jest.fn(),
            delete: jest.fn(),
        };
        sut = new DatabaseProviderRegistrationsRepository(
            mockRepository as unknown as Repository<DbProviderRegistrationEntity>,
            cipher,
        );
    });

    describe('findByState', () => {
        it('finds the row the state names and maps it to the domain registration', async () => {
            const entity = registrationEntity();
            mockRepository.findOneBy.mockResolvedValue(entity);

            const result = await sut.findByState(entity.state);

            expect(mockRepository.findOneBy).toHaveBeenCalledTimes(1);
            expect(mockRepository.findOneBy).toHaveBeenCalledWith({ state: entity.state });
            expect(result).toEqual<ProviderRegistration>(domainRegistrationOf(entity));
        });

        it('returns null when no row carries the state', async () => {
            mockRepository.findOneBy.mockResolvedValue(null);

            expect(await sut.findByState('unknown-state')).toBeNull();
        });

        it('never carries the clear private key of the row it answers', async () => {
            const entity = registrationEntity({
                step: ProviderRegistrationStep.AwaitingInstallation,
                appId: '123456',
                appSlug: 'gitpaas-acme',
                encryptedPrivateKey: cipher.encryptSecret(PEM),
            });
            mockRepository.findOneBy.mockResolvedValue(entity);

            const result = await sut.findByState(entity.state);

            expect(result).not.toHaveProperty('privateKey');
            expect(JSON.stringify(result)).not.toContain('BEGIN RSA PRIVATE KEY');
            expect(JSON.stringify(result)).not.toContain(PEM.split('\n')[1]);
        });
    });

    describe('create', () => {
        it('creates the row at the step awaiting_creation, saves it, and maps the saved row', async () => {
            const entity = registrationEntity();
            mockRepository.create.mockReturnValue(entity);
            mockRepository.save.mockResolvedValue(entity);

            const result = await sut.create(newRegistration);

            expect(mockRepository.create).toHaveBeenCalledTimes(1);
            expect(mockRepository.create).toHaveBeenCalledWith({
                state: newRegistration.state,
                name: newRegistration.name,
                ownerType: ProviderAppOwnerType.Personal,
                ownerLogin: null,
                step: ProviderRegistrationStep.AwaitingCreation,
                expiresAt: newRegistration.expiresAt,
            });
            expect(mockRepository.save).toHaveBeenCalledWith(entity);
            expect(result).toEqual<ProviderRegistration>(domainRegistrationOf(entity));
            expect(result).not.toBe(entity);
        });

        it('writes the login of an organization the registration names', async () => {
            const entity = registrationEntity({
                ownerType: ProviderAppOwnerType.Organization,
                ownerLogin: 'gitopslovers',
            });
            mockRepository.create.mockReturnValue(entity);
            mockRepository.save.mockResolvedValue(entity);

            await sut.create({
                ...newRegistration,
                ownerType: ProviderAppOwnerType.Organization,
                ownerLogin: 'gitopslovers',
            });

            expect(mockRepository.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    ownerType: ProviderAppOwnerType.Organization,
                    ownerLogin: 'gitopslovers',
                }),
            );
        });

        it('writes no application value on a row that starts', async () => {
            const entity = registrationEntity();
            mockRepository.create.mockReturnValue(entity);
            mockRepository.save.mockResolvedValue(entity);

            const result = await sut.create(newRegistration);

            expect(mockRepository.create).toHaveBeenCalledWith(
                expect.not.objectContaining({ encryptedPrivateKey: expect.anything() }),
            );
            expect(result.appId).toBeNull();
            expect(result.appSlug).toBeNull();
            expect(result.encryptedPrivateKey).toBeNull();
        });

        it('propagates a persistence failure raised by the save', async () => {
            const error = new Error('duplicate key value violates unique constraint');
            mockRepository.create.mockReturnValue(registrationEntity());
            mockRepository.save.mockRejectedValue(error);

            await expect(sut.create(newRegistration)).rejects.toBe(error);
        });
    });

    describe('saveConversion', () => {
        it('merges the identifier, the short name and the sealed key, and moves the step', async () => {
            const existing = registrationEntity();
            const saved = registrationEntity({
                step: ProviderRegistrationStep.AwaitingInstallation,
                appId: '123456',
                appSlug: 'gitpaas-acme',
                encryptedPrivateKey: cipher.encryptSecret(PEM),
            });
            mockRepository.findOneBy.mockResolvedValue(existing);
            mockRepository.save.mockResolvedValue(saved);

            const result = await sut.saveConversion(existing.state, conversion);

            expect(mockRepository.findOneBy).toHaveBeenCalledWith({ state: existing.state });
            expect(mockRepository.merge).toHaveBeenCalledTimes(1);
            expect(mockRepository.merge).toHaveBeenCalledWith(existing, {
                appId: '123456',
                appSlug: 'gitpaas-acme',
                encryptedPrivateKey: expect.any(String),
                step: ProviderRegistrationStep.AwaitingInstallation,
            });
            expect(mockRepository.save).toHaveBeenCalledWith(existing);
            expect(result).toEqual<ProviderRegistration>(domainRegistrationOf(saved));
        });

        it('seals the private key before it reaches the merge', async () => {
            const existing = registrationEntity();
            mockRepository.findOneBy.mockResolvedValue(existing);
            mockRepository.save.mockResolvedValue(existing);

            await sut.saveConversion(existing.state, conversion);

            const merged = mockRepository.merge.mock.calls[0][1] as { encryptedPrivateKey: string };

            expect(merged.encryptedPrivateKey).not.toBe(PEM);
            expect(cipher.decryptSecret(merged.encryptedPrivateKey)).toBe(PEM);
        });

        it('never writes the clear private key of the conversion into the row', async () => {
            const existing = registrationEntity();
            mockRepository.findOneBy.mockResolvedValue(existing);
            mockRepository.save.mockResolvedValue(existing);

            await sut.saveConversion(existing.state, conversion);

            expect(mockRepository.merge).toHaveBeenCalledWith(
                existing,
                expect.not.objectContaining({ privateKey: expect.anything() }),
            );
            expect(JSON.stringify(mockRepository.merge.mock.calls[0])).not.toContain('BEGIN RSA PRIVATE KEY');
            expect(JSON.stringify(mockRepository.save.mock.calls[0])).not.toContain('BEGIN RSA PRIVATE KEY');
        });

        it('never carries the clear private key in the registration it answers', async () => {
            const existing = registrationEntity();
            const saved = registrationEntity({
                step: ProviderRegistrationStep.AwaitingInstallation,
                appId: '123456',
                appSlug: 'gitpaas-acme',
                encryptedPrivateKey: cipher.encryptSecret(PEM),
            });
            mockRepository.findOneBy.mockResolvedValue(existing);
            mockRepository.save.mockResolvedValue(saved);

            const result = await sut.saveConversion(existing.state, conversion);

            expect(result).not.toHaveProperty('privateKey');
            expect(JSON.stringify(result)).not.toContain('BEGIN RSA PRIVATE KEY');
            expect(JSON.stringify(result)).not.toContain(PEM.split('\n')[1]);
        });

        it('returns null and neither merges nor saves when no row carries the state', async () => {
            mockRepository.findOneBy.mockResolvedValue(null);

            const result = await sut.saveConversion('unknown-state', conversion);

            expect(result).toBeNull();
            expect(mockRepository.merge).not.toHaveBeenCalled();
            expect(mockRepository.save).not.toHaveBeenCalled();
        });
    });

    describe('deleteExpired', () => {
        const now = new Date('2026-01-01T12:00:00.000Z');

        it('removes the rows whose date passed, and keeps the others', async () => {
            const rows = [
                registrationEntity({ id: 'expired-1', expiresAt: new Date('2026-01-01T11:00:00.000Z') }),
                registrationEntity({ id: 'expired-2', expiresAt: new Date('2025-12-31T23:59:59.000Z') }),
                registrationEntity({ id: 'alive-1', expiresAt: new Date('2026-01-01T12:00:00.000Z') }),
                registrationEntity({ id: 'alive-2', expiresAt: new Date('2026-01-01T13:00:00.000Z') }),
            ];
            let kept = rows;
            mockRepository.delete.mockImplementation((criteria) => {
                const operator = (criteria as { expiresAt: FindOperator<Date> }).expiresAt;
                const removed = kept.filter((row) => row.expiresAt.getTime() < operator.value.getTime());
                kept = kept.filter((row) => !removed.includes(row));

                return Promise.resolve({ affected: removed.length, raw: [] });
            });

            const result = await sut.deleteExpired(now);

            expect(mockRepository.delete).toHaveBeenCalledTimes(1);
            expect(mockRepository.delete).toHaveBeenCalledWith({ expiresAt: LessThan(now) });
            expect(result).toBe(2);
            expect(kept.map((row) => row.id)).toEqual(['alive-1', 'alive-2']);
        });

        it('returns the number of rows the database reports as removed', async () => {
            mockRepository.delete.mockResolvedValue({ affected: 3, raw: [] });

            expect(await sut.deleteExpired(now)).toBe(3);
        });

        it('returns 0 when no row passed its date', async () => {
            mockRepository.delete.mockResolvedValue({ affected: 0, raw: [] });

            expect(await sut.deleteExpired(now)).toBe(0);
        });

        it('returns 0 when the driver reports no count at all', async () => {
            mockRepository.delete.mockResolvedValue({ affected: undefined, raw: [] });

            expect(await sut.deleteExpired(now)).toBe(0);
        });
    });
});
