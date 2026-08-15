import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';

import { CreateProviderDto } from '../../../domain/dtos/create-provider.dto';
import { UpdateProviderDto } from '../../../domain/dtos/update-provider.dto';
import {
    ProviderCredentialsInvalidError,
    ProviderInUseError,
    ProviderNameTakenError,
} from '../../../domain/errors/provider.errors';
import { GitBranch } from '../../../domain/models/git-branch.models';
import { GitRepository } from '../../../domain/models/git-repository.models';
import { Provider, ProviderType } from '../../../domain/models/provider.models';
import { ProvidersService } from '../../services/providers.service';
import { ProvidersController } from '../providers.controller';

import { getTelemetry, runWithTelemetry } from '@core/infrastructure/telemetry/telemetry.context';

const providerId = 'b2a2132b-d6b7-464a-8aaf-c659a3ca0d60';

const privateKey = '-----BEGIN RSA PRIVATE KEY-----\nMIIEowIBAAKCAQEA\n-----END RSA PRIVATE KEY-----';

/** Builds a provider read-model fixture, overriding only the fields under test. */
const providerFixture = (overrides: Partial<Provider> = {}): Provider => ({
    id: providerId,
    name: 'default',
    type: ProviderType.GithubApp,
    appId: '123456',
    installationId: '7891011',
    keyFingerprint: 'a1b2c3d4',
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-02T00:00:00.000Z'),
    ...overrides,
});

const provider = providerFixture();

const repositories: GitRepository[] = [
    { id: 42, fullName: 'gitopslovers/gitpaas', defaultBranch: 'main', private: false },
];

const branches: GitBranch[] = [{ name: 'main' }];

describe('ProvidersController', () => {
    let mockProvidersService: jest.Mocked<
        Pick<
            ProvidersService,
            | 'getAll'
            | 'findById'
            | 'create'
            | 'update'
            | 'delete'
            | 'testConnection'
            | 'listRepositories'
            | 'listBranches'
        >
    >;
    let sut: ProvidersController;

    beforeEach(async () => {
        jest.clearAllMocks();

        mockProvidersService = {
            getAll: jest.fn(),
            findById: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
            testConnection: jest.fn(),
            listRepositories: jest.fn(),
            listBranches: jest.fn(),
        };

        const moduleRef = await Test.createTestingModule({
            controllers: [ProvidersController],
            providers: [{ provide: ProvidersService, useValue: mockProvidersService }],
        }).compile();

        sut = moduleRef.get(ProvidersController);
    });

    describe('getAll', () => {
        it('delegates to the service', async () => {
            mockProvidersService.getAll.mockResolvedValue([provider]);

            await sut.getAll();

            expect(mockProvidersService.getAll).toHaveBeenCalledTimes(1);
            expect(mockProvidersService.getAll).toHaveBeenCalledWith();
        });

        it('returns the providers produced by the service', async () => {
            mockProvidersService.getAll.mockResolvedValue([provider]);

            const result = await sut.getAll();

            expect(result).toEqual([provider]);
        });

        it('returns an empty list when no provider exists', async () => {
            mockProvidersService.getAll.mockResolvedValue([]);

            const result = await sut.getAll();

            expect(result).toEqual([]);
        });

        it('propagates errors raised by the service', async () => {
            const error = new Error('db unreachable');
            mockProvidersService.getAll.mockRejectedValue(error);

            await expect(sut.getAll()).rejects.toBe(error);
        });
    });

    describe('findById', () => {
        it('delegates to the service with the received id', async () => {
            mockProvidersService.findById.mockResolvedValue(provider);

            await sut.findById(providerId);

            expect(mockProvidersService.findById).toHaveBeenCalledTimes(1);
            expect(mockProvidersService.findById).toHaveBeenCalledWith(providerId);
        });

        it('returns the provider produced by the service', async () => {
            mockProvidersService.findById.mockResolvedValue(provider);

            const result = await sut.findById(providerId);

            expect(result).toBe(provider);
        });

        it('throws a NotFoundException when the provider does not exist', async () => {
            mockProvidersService.findById.mockResolvedValue(null);

            await expect(sut.findById(providerId)).rejects.toBeInstanceOf(NotFoundException);
        });

        it('includes the id in the not-found message', async () => {
            mockProvidersService.findById.mockResolvedValue(null);

            await expect(sut.findById(providerId)).rejects.toThrow(`Provider ${providerId} not found`);
        });

        it('propagates errors raised by the service', async () => {
            const error = new Error('db unreachable');
            mockProvidersService.findById.mockRejectedValue(error);

            await expect(sut.findById(providerId)).rejects.toBe(error);
        });
    });

    describe('create', () => {
        const createDto: CreateProviderDto = {
            name: 'default',
            type: ProviderType.GithubApp,
            appId: '123456',
            installationId: '7891011',
            privateKey,
        };

        it('delegates to the service with the received dto', async () => {
            mockProvidersService.create.mockResolvedValue(provider);

            await sut.create(createDto);

            expect(mockProvidersService.create).toHaveBeenCalledTimes(1);
            expect(mockProvidersService.create).toHaveBeenCalledWith(createDto);
        });

        it('returns the created provider', async () => {
            mockProvidersService.create.mockResolvedValue(provider);

            const result = await sut.create(createDto);

            expect(result).toBe(provider);
        });

        it('translates a taken name into a ConflictException', async () => {
            mockProvidersService.create.mockRejectedValue(new ProviderNameTakenError('default'));

            await expect(sut.create(createDto)).rejects.toBeInstanceOf(ConflictException);
        });

        it('names the taken name in the conflict message', async () => {
            mockProvidersService.create.mockRejectedValue(new ProviderNameTakenError('default'));

            await expect(sut.create(createDto)).rejects.toThrow('Provider name default is already taken');
        });

        it('propagates errors raised by the service that no translation covers', async () => {
            const error = new Error('db unreachable');
            mockProvidersService.create.mockRejectedValue(error);

            await expect(sut.create(createDto)).rejects.toBe(error);
        });
    });

    describe('update', () => {
        const updateDto: UpdateProviderDto = { name: 'renamed' };

        it('delegates to the service with the received id and dto', async () => {
            mockProvidersService.update.mockResolvedValue(provider);

            await sut.update(providerId, updateDto);

            expect(mockProvidersService.update).toHaveBeenCalledTimes(1);
            expect(mockProvidersService.update).toHaveBeenCalledWith(providerId, updateDto);
        });

        it('returns the updated provider produced by the service', async () => {
            const updated = providerFixture({ name: 'renamed' });
            mockProvidersService.update.mockResolvedValue(updated);

            const result = await sut.update(providerId, updateDto);

            expect(result).toBe(updated);
        });

        it('forwards a change that carries no private key untouched', async () => {
            mockProvidersService.update.mockResolvedValue(provider);

            await sut.update(providerId, { name: 'renamed' });

            expect(mockProvidersService.update).toHaveBeenCalledWith(providerId, { name: 'renamed' });
        });

        it('throws a NotFoundException when the provider does not exist', async () => {
            mockProvidersService.update.mockResolvedValue(null);

            await expect(sut.update(providerId, updateDto)).rejects.toBeInstanceOf(NotFoundException);
        });

        it('includes the id in the not-found message', async () => {
            mockProvidersService.update.mockResolvedValue(null);

            await expect(sut.update(providerId, updateDto)).rejects.toThrow(`Provider ${providerId} not found`);
        });

        it('translates a taken name into a ConflictException', async () => {
            mockProvidersService.update.mockRejectedValue(new ProviderNameTakenError('renamed'));

            await expect(sut.update(providerId, updateDto)).rejects.toBeInstanceOf(ConflictException);
        });

        it('propagates errors raised by the service that no translation covers', async () => {
            const error = new Error('db unreachable');
            mockProvidersService.update.mockRejectedValue(error);

            await expect(sut.update(providerId, updateDto)).rejects.toBe(error);
        });
    });

    describe('delete', () => {
        it('delegates to the service with the received id', async () => {
            mockProvidersService.delete.mockResolvedValue(true);

            await sut.delete(providerId);

            expect(mockProvidersService.delete).toHaveBeenCalledTimes(1);
            expect(mockProvidersService.delete).toHaveBeenCalledWith(providerId);
        });

        it('resolves with no value when a row was deleted', async () => {
            mockProvidersService.delete.mockResolvedValue(true);

            await expect(sut.delete(providerId)).resolves.toBeUndefined();
        });

        it('throws a NotFoundException when nothing was deleted', async () => {
            mockProvidersService.delete.mockResolvedValue(false);

            await expect(sut.delete(providerId)).rejects.toBeInstanceOf(NotFoundException);
        });

        it('includes the id in the not-found message', async () => {
            mockProvidersService.delete.mockResolvedValue(false);

            await expect(sut.delete(providerId)).rejects.toThrow(`Provider ${providerId} not found`);
        });

        it('translates a provider still in use into a ConflictException', async () => {
            mockProvidersService.delete.mockRejectedValue(new ProviderInUseError(providerId, 2));

            await expect(sut.delete(providerId)).rejects.toBeInstanceOf(ConflictException);
        });

        it('names the blocking services count in the conflict message', async () => {
            mockProvidersService.delete.mockRejectedValue(new ProviderInUseError(providerId, 2));

            await expect(sut.delete(providerId)).rejects.toThrow(
                `Provider ${providerId} is still used by 2 service(s)`,
            );
        });

        it('propagates errors raised by the service that no translation covers', async () => {
            const error = new Error('db unreachable');
            mockProvidersService.delete.mockRejectedValue(error);

            await expect(sut.delete(providerId)).rejects.toBe(error);
        });
    });

    describe('testConnection', () => {
        it('delegates to the service with the received id', async () => {
            mockProvidersService.testConnection.mockResolvedValue({ success: true });

            await sut.testConnection(providerId);

            expect(mockProvidersService.testConnection).toHaveBeenCalledTimes(1);
            expect(mockProvidersService.testConnection).toHaveBeenCalledWith(providerId);
        });

        it('reports a successful test', async () => {
            mockProvidersService.testConnection.mockResolvedValue({ success: true });

            const result = await sut.testConnection(providerId);

            expect(result).toEqual({ success: true });
        });

        it('reports a failed test when the source control refuses the credentials', async () => {
            mockProvidersService.testConnection.mockResolvedValue({ success: false });

            const result = await sut.testConnection(providerId);

            expect(result).toEqual({ success: false });
        });

        it('translates invalid credentials into a BadRequestException', async () => {
            mockProvidersService.testConnection.mockRejectedValue(new ProviderCredentialsInvalidError(providerId));

            await expect(sut.testConnection(providerId)).rejects.toBeInstanceOf(BadRequestException);
        });

        it('propagates errors raised by the service that no translation covers', async () => {
            const error = new Error('github unreachable');
            mockProvidersService.testConnection.mockRejectedValue(error);

            await expect(sut.testConnection(providerId)).rejects.toBe(error);
        });
    });

    describe('listRepositories', () => {
        it('delegates to the service with the received provider id', async () => {
            mockProvidersService.listRepositories.mockResolvedValue(repositories);

            await sut.listRepositories(providerId);

            expect(mockProvidersService.listRepositories).toHaveBeenCalledTimes(1);
            expect(mockProvidersService.listRepositories).toHaveBeenCalledWith(providerId);
        });

        it('returns the repositories produced by the service', async () => {
            mockProvidersService.listRepositories.mockResolvedValue(repositories);

            const result = await sut.listRepositories(providerId);

            expect(result).toEqual(repositories);
        });

        it('returns an empty list when the installation reaches no repository', async () => {
            mockProvidersService.listRepositories.mockResolvedValue([]);

            const result = await sut.listRepositories(providerId);

            expect(result).toEqual([]);
        });

        it('translates invalid credentials into a BadRequestException', async () => {
            mockProvidersService.listRepositories.mockRejectedValue(new ProviderCredentialsInvalidError(providerId));

            await expect(sut.listRepositories(providerId)).rejects.toBeInstanceOf(BadRequestException);
        });

        it('propagates errors raised by the service that no translation covers', async () => {
            const error = new Error('github unreachable');
            mockProvidersService.listRepositories.mockRejectedValue(error);

            await expect(sut.listRepositories(providerId)).rejects.toBe(error);
        });
    });

    describe('listBranches', () => {
        it('delegates to the service with the received provider id and repository id', async () => {
            mockProvidersService.listBranches.mockResolvedValue(branches);

            await sut.listBranches(providerId, 42);

            expect(mockProvidersService.listBranches).toHaveBeenCalledTimes(1);
            expect(mockProvidersService.listBranches).toHaveBeenCalledWith(providerId, 42);
        });

        it('returns the branches produced by the service', async () => {
            mockProvidersService.listBranches.mockResolvedValue(branches);

            const result = await sut.listBranches(providerId, 42);

            expect(result).toEqual(branches);
        });

        it('returns an empty list when the repository has no branch', async () => {
            mockProvidersService.listBranches.mockResolvedValue([]);

            const result = await sut.listBranches(providerId, 42);

            expect(result).toEqual([]);
        });

        it('propagates errors raised by the service that no translation covers', async () => {
            const error = new Error('github unreachable');
            mockProvidersService.listBranches.mockRejectedValue(error);

            await expect(sut.listBranches(providerId, 42)).rejects.toBe(error);
        });
    });

    describe('no answer carries a private key', () => {
        it('gives the fingerprint of the key, and no key, when a client reads one provider', async () => {
            mockProvidersService.findById.mockResolvedValue(provider);

            const result = await sut.findById(providerId);

            expect(result).not.toHaveProperty('privateKey');
            expect(result.keyFingerprint).toBe('a1b2c3d4');
            expect(JSON.stringify(result)).not.toContain('PRIVATE KEY');
        });

        it('gives no key in any element of the list of the providers', async () => {
            mockProvidersService.getAll.mockResolvedValue([provider, providerFixture({ name: 'second' })]);

            const result = await sut.getAll();

            expect(result.every((item) => !('privateKey' in item))).toBe(true);
            expect(JSON.stringify(result)).not.toContain('PRIVATE KEY');
        });

        it('gives no key in the answer of a creation, though the request carried one', async () => {
            mockProvidersService.create.mockResolvedValue(provider);

            const result = await sut.create({
                name: 'default',
                type: ProviderType.GithubApp,
                appId: '123456',
                installationId: '7891011',
                privateKey,
            });

            expect(result).not.toHaveProperty('privateKey');
            expect(JSON.stringify(result)).not.toContain('PRIVATE KEY');
        });

        it('gives no key in the answer of a change, though the request carried one', async () => {
            mockProvidersService.update.mockResolvedValue(provider);

            const result = await sut.update(providerId, { privateKey });

            expect(result).not.toHaveProperty('privateKey');
            expect(JSON.stringify(result)).not.toContain('PRIVATE KEY');
        });

        it('gives no key in the answer of a test of the connection', async () => {
            mockProvidersService.testConnection.mockResolvedValue({ success: true });

            const result = await sut.testConnection(providerId);

            expect(Object.keys(result)).toEqual(['success']);
        });
    });

    describe('telemetry event enrichment', () => {
        it('adds the provider id of a read', async () => {
            mockProvidersService.findById.mockResolvedValue(provider);

            const event = await runWithTelemetry({}, async () => {
                await sut.findById(providerId);

                return getTelemetry();
            });

            expect(event).toMatchObject({ 'provider.id': providerId });
        });

        it('adds the provider id of an update', async () => {
            mockProvidersService.update.mockResolvedValue(provider);

            const event = await runWithTelemetry({}, async () => {
                await sut.update(providerId, { name: 'renamed' });

                return getTelemetry();
            });

            expect(event).toMatchObject({ 'provider.id': providerId });
        });

        it('adds the provider id of a delete', async () => {
            mockProvidersService.delete.mockResolvedValue(true);

            const event = await runWithTelemetry({}, async () => {
                await sut.delete(providerId);

                return getTelemetry();
            });

            expect(event).toMatchObject({ 'provider.id': providerId });
        });

        it('adds the provider id of a test of the connection', async () => {
            mockProvidersService.testConnection.mockResolvedValue({ success: true });

            const event = await runWithTelemetry({}, async () => {
                await sut.testConnection(providerId);

                return getTelemetry();
            });

            expect(event).toMatchObject({ 'provider.id': providerId });
        });

        it('adds the provider id and the repository id of a list of the branches', async () => {
            mockProvidersService.listBranches.mockResolvedValue(branches);

            const event = await runWithTelemetry({}, async () => {
                await sut.listBranches(providerId, 42);

                return getTelemetry();
            });

            expect(event).toMatchObject({ 'provider.id': providerId, 'deps.github.repository_id': 42 });
        });
    });
});
