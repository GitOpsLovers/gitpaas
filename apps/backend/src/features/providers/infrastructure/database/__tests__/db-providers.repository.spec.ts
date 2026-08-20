/* eslint-disable no-secrets/no-secrets */
import { createHash } from 'node:crypto';

import type { CreateProviderDto } from '@gitpaas/contracts';
import { EntityManager, Repository } from 'typeorm';

import { Provider, ProviderCredentials, ProviderType } from '../../../domain/models/provider.models';
import { DbProviderEntity } from '../db-provider.entity';
import { DatabaseProvidersRepository } from '../db-providers.repository';

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
const KEY = 'e'.repeat(64);

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

/**
 * Builds the domain provider the transformer gives for a fixture entity.
 */
const domainProviderOf = (entity: DbProviderEntity): Provider => ({
    id: entity.id,
    name: entity.name,
    type: entity.type,
    appId: entity.appId,
    installationId: entity.installationId,
    keyFingerprint: FINGERPRINT,
    createdAt: entity.createdAt,
    updatedAt: entity.updatedAt,
});

describe('DatabaseProvidersRepository', () => {
    // eslint-disable-next-line security/detect-object-injection
    const originalKey = process.env[KEY_VARIABLE];
    const sealedKey = 'iv:tag:cipher';

    const createDto: CreateProviderDto = {
        name: 'acme',
        appId: '123456',
        installationId: '654321',
        privateKey: PEM,
    };

    let mockManager: jest.Mocked<Pick<EntityManager, 'query'>>;
    let mockRepository: jest.Mocked<
        Pick<Repository<DbProviderEntity>, 'find' | 'findOneBy' | 'create' | 'merge' | 'save' | 'delete'>
    > & { manager: jest.Mocked<Pick<EntityManager, 'query'>> };
    let sut: DatabaseProvidersRepository;

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

        mockManager = {
            query: jest.fn(),
        };
        mockRepository = {
            find: jest.fn(),
            findOneBy: jest.fn(),
            create: jest.fn(),
            merge: jest.fn(),
            save: jest.fn(),
            delete: jest.fn(),
            manager: mockManager,
        };
        sut = new DatabaseProvidersRepository(mockRepository as unknown as Repository<DbProviderEntity>, cipher);
    });

    describe('getAll', () => {
        it('finds the providers newest first and maps them to domain', async () => {
            const first = providerEntity({ id: '11111111-1111-4111-8111-111111111111', name: 'platform' });
            const second = providerEntity({ id: '22222222-2222-4222-8222-222222222222', name: 'acme' });
            mockRepository.find.mockResolvedValue([first, second]);

            const result = await sut.getAll();

            expect(mockRepository.find).toHaveBeenCalledTimes(1);
            expect(mockRepository.find).toHaveBeenCalledWith({ order: { createdAt: 'DESC' } });
            expect(result).toEqual<Provider[]>([domainProviderOf(first), domainProviderOf(second)]);
        });

        it('never carries a private key in the providers it lists', async () => {
            const entity = providerEntity();
            mockRepository.find.mockResolvedValue([entity]);

            const result = await sut.getAll();

            expect(JSON.stringify(result)).not.toContain('BEGIN RSA PRIVATE KEY');
            expect(JSON.stringify(result)).not.toContain(entity.encryptedPrivateKey);
        });

        it('returns an empty list when there is no provider', async () => {
            mockRepository.find.mockResolvedValue([]);

            expect(await sut.getAll()).toEqual([]);
        });
    });

    describe('findById', () => {
        it('finds a provider by id and returns the mapped domain provider', async () => {
            const entity = providerEntity();
            mockRepository.findOneBy.mockResolvedValue(entity);

            const result = await sut.findById(entity.id);

            expect(mockRepository.findOneBy).toHaveBeenCalledWith({ id: entity.id });
            expect(result).toEqual<Provider>(domainProviderOf(entity));
            expect(result).not.toHaveProperty('encryptedPrivateKey');
        });

        it('returns null when no provider matches the id', async () => {
            mockRepository.findOneBy.mockResolvedValue(null);

            expect(await sut.findById('missing-id')).toBeNull();
        });
    });

    describe('findByName', () => {
        it('finds a provider by name and returns the mapped domain provider', async () => {
            const entity = providerEntity();
            mockRepository.findOneBy.mockResolvedValue(entity);

            const result = await sut.findByName(entity.name);

            expect(mockRepository.findOneBy).toHaveBeenCalledWith({ name: entity.name });
            expect(result).toEqual<Provider>(domainProviderOf(entity));
        });

        it('returns null when no provider carries the name', async () => {
            mockRepository.findOneBy.mockResolvedValue(null);

            expect(await sut.findByName('missing-name')).toBeNull();
        });
    });

    describe('create', () => {
        it('creates an entity holding the sealed key, saves it, and maps the saved row', async () => {
            const entity = providerEntity();
            mockRepository.create.mockReturnValue(entity);
            mockRepository.save.mockResolvedValue(entity);

            const result = await sut.create(createDto, sealedKey);

            expect(mockRepository.create).toHaveBeenCalledWith({
                name: createDto.name,
                type: ProviderType.GithubApp,
                appId: createDto.appId,
                installationId: createDto.installationId,
                encryptedPrivateKey: sealedKey,
            });
            expect(mockRepository.save).toHaveBeenCalledWith(entity);
            expect(result).toEqual<Provider>(domainProviderOf(entity));
            expect(result).not.toBe(entity);
        });

        it('never writes the clear private key of the DTO into the row', async () => {
            const entity = providerEntity();
            mockRepository.create.mockReturnValue(entity);
            mockRepository.save.mockResolvedValue(entity);

            await sut.create(createDto, sealedKey);

            expect(mockRepository.create).toHaveBeenCalledWith(
                expect.not.objectContaining({ privateKey: expect.anything() }),
            );
            expect(JSON.stringify(mockRepository.create.mock.calls[0])).not.toContain('BEGIN RSA PRIVATE KEY');
        });

        it('keeps the type of the DTO when it holds one', async () => {
            const entity = providerEntity();
            mockRepository.create.mockReturnValue(entity);
            mockRepository.save.mockResolvedValue(entity);

            await sut.create({ ...createDto, type: ProviderType.GithubApp }, sealedKey);

            expect(mockRepository.create).toHaveBeenCalledWith(
                expect.objectContaining({ type: ProviderType.GithubApp }),
            );
        });

        it('propagates a persistence failure raised by the save', async () => {
            const error = new Error('duplicate key value violates unique constraint');
            mockRepository.create.mockReturnValue(providerEntity());
            mockRepository.save.mockRejectedValue(error);

            await expect(sut.create(createDto, sealedKey)).rejects.toBe(error);
        });
    });

    describe('update', () => {
        it('returns null and does not merge or save when the provider is not found', async () => {
            mockRepository.findOneBy.mockResolvedValue(null);

            const result = await sut.update('missing-id', { name: 'renamed' });

            expect(result).toBeNull();
            expect(mockRepository.merge).not.toHaveBeenCalled();
            expect(mockRepository.save).not.toHaveBeenCalled();
        });

        it('merges only the fields the DTO holds, saves the row, and maps it', async () => {
            const existing = providerEntity();
            const saved = providerEntity({ name: 'renamed' });
            mockRepository.findOneBy.mockResolvedValue(existing);
            mockRepository.save.mockResolvedValue(saved);

            const result = await sut.update(existing.id, { name: 'renamed' });

            expect(mockRepository.findOneBy).toHaveBeenCalledWith({ id: existing.id });
            expect(mockRepository.merge).toHaveBeenCalledWith(existing, { name: 'renamed' });
            expect(mockRepository.save).toHaveBeenCalledWith(existing);
            expect(result).toEqual<Provider>(domainProviderOf(saved));
        });

        it('keeps the stored key when no sealed key is given', async () => {
            const existing = providerEntity();
            mockRepository.findOneBy.mockResolvedValue(existing);
            mockRepository.save.mockResolvedValue(existing);

            await sut.update(existing.id, { name: 'renamed', privateKey: '' });

            expect(mockRepository.merge).toHaveBeenCalledWith(existing, { name: 'renamed' });
        });

        it('replaces the stored key when a sealed key is given', async () => {
            const existing = providerEntity();
            mockRepository.findOneBy.mockResolvedValue(existing);
            mockRepository.save.mockResolvedValue(existing);

            await sut.update(existing.id, { name: 'renamed' }, sealedKey);

            expect(mockRepository.merge).toHaveBeenCalledWith(existing, {
                name: 'renamed',
                encryptedPrivateKey: sealedKey,
            });
        });

        it('never puts the clear private key of the DTO into the merge', async () => {
            const existing = providerEntity();
            mockRepository.findOneBy.mockResolvedValue(existing);
            mockRepository.save.mockResolvedValue(existing);

            await sut.update(existing.id, { privateKey: PEM }, sealedKey);

            expect(mockRepository.merge).toHaveBeenCalledWith(existing, { encryptedPrivateKey: sealedKey });
        });

        it('merges every field the DTO holds', async () => {
            const existing = providerEntity();
            mockRepository.findOneBy.mockResolvedValue(existing);
            mockRepository.save.mockResolvedValue(existing);

            await sut.update(
                existing.id,
                {
                    name: 'renamed',
                    type: ProviderType.GithubApp,
                    appId: '999',
                    installationId: '888',
                },
                sealedKey,
            );

            expect(mockRepository.merge).toHaveBeenCalledWith(existing, {
                name: 'renamed',
                type: ProviderType.GithubApp,
                appId: '999',
                installationId: '888',
                encryptedPrivateKey: sealedKey,
            });
        });
    });

    describe('delete', () => {
        it('returns true when a row was affected', async () => {
            mockRepository.delete.mockResolvedValue({ affected: 1, raw: [] });

            const result = await sut.delete('some-id');

            expect(mockRepository.delete).toHaveBeenCalledWith('some-id');
            expect(result).toBe(true);
        });

        it('returns false when no rows were affected', async () => {
            mockRepository.delete.mockResolvedValue({ affected: 0, raw: [] });

            expect(await sut.delete('some-id')).toBe(false);
        });

        it('returns false when affected is undefined', async () => {
            mockRepository.delete.mockResolvedValue({ affected: undefined, raw: [] });

            expect(await sut.delete('some-id')).toBe(false);
        });
    });

    describe('countServices', () => {
        it('counts the services of the provider with a parameterised query', async () => {
            mockManager.query.mockResolvedValue([{ count: 3 }]);

            const result = await sut.countServices('some-id');

            expect(mockManager.query).toHaveBeenCalledTimes(1);
            expect(mockManager.query).toHaveBeenCalledWith(
                'SELECT COUNT(*)::int AS "count" FROM "services" WHERE "providerId" = $1',
                ['some-id'],
            );
            expect(result).toBe(3);
        });

        it('returns 0 when the provider holds no service', async () => {
            mockManager.query.mockResolvedValue([{ count: 0 }]);

            expect(await sut.countServices('some-id')).toBe(0);
        });

        it('returns 0 when the driver answers no row at all', async () => {
            mockManager.query.mockResolvedValue([]);

            expect(await sut.countServices('some-id')).toBe(0);
        });

        it('coerces a count the driver reports as a string', async () => {
            mockManager.query.mockResolvedValue([{ count: '5' }]);

            expect(await sut.countServices('some-id')).toBe(5);
        });

        it('propagates errors raised by the query', async () => {
            const error = new Error('database unavailable');
            mockManager.query.mockRejectedValue(error);

            await expect(sut.countServices('some-id')).rejects.toBe(error);
        });
    });

    describe('getCredentials', () => {
        it('finds the row by id and opens the private key', async () => {
            const entity = providerEntity();
            mockRepository.findOneBy.mockResolvedValue(entity);

            const result = await sut.getCredentials(entity.id);

            expect(mockRepository.findOneBy).toHaveBeenCalledWith({ id: entity.id });
            expect(result).toEqual<ProviderCredentials>({
                providerId: entity.id,
                appId: entity.appId,
                installationId: entity.installationId,
                privateKey: PEM,
            });
        });

        it('returns null when no provider matches the id', async () => {
            mockRepository.findOneBy.mockResolvedValue(null);

            expect(await sut.getCredentials('missing-id')).toBeNull();
        });
    });
});
