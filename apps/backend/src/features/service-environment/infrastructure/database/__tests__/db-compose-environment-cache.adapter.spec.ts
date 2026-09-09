import { Repository } from 'typeorm';

import { DatabaseComposeEnvironmentCacheAdapter } from '../db-compose-environment-cache.adapter';

import { DbServiceEntity } from '@features/services/infrastructure/database/db-service.entity';

const serviceId = 'f4f8c2a0-6d3b-4d0a-9b6e-2c1d5e8a7b90';
const refreshedAt = '2026-01-02T03:04:05.000Z';

/** Builds a service database-entity fixture, overriding only the fields under test. */
const serviceEntity = (overrides: Partial<DbServiceEntity> = {}): DbServiceEntity => ({
    id: serviceId,
    name: 'api',
    description: '',
    projectId: 'c3d4e5f6-a7b8-4c9d-8e1f-2a3b4c5d6e7f',
    composeProject: 'api',
    providerId: null,
    repositoryId: '',
    deploymentBranch: '',
    composerPath: '',
    composeEnvironment: { variables: { DATABASE_URL: '', PORT: '8080' }, refreshedAt },
    composeDomains: null,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    ...overrides,
});

describe('DatabaseComposeEnvironmentCacheAdapter', () => {
    let mockRepository: jest.Mocked<Pick<Repository<DbServiceEntity>, 'findOne' | 'update'>>;
    let sut: DatabaseComposeEnvironmentCacheAdapter;

    beforeEach(() => {
        jest.clearAllMocks();

        mockRepository = { findOne: jest.fn(), update: jest.fn() };
        sut = new DatabaseComposeEnvironmentCacheAdapter(
            mockRepository as unknown as Repository<DbServiceEntity>,
        );
    });

    describe('findByService', () => {
        it('reads the cache of the named service alone', async () => {
            mockRepository.findOne.mockResolvedValue(serviceEntity());

            await sut.findByService(serviceId);

            expect(mockRepository.findOne).toHaveBeenCalledTimes(1);
            expect(mockRepository.findOne).toHaveBeenCalledWith({
                where: { id: serviceId },
                select: { id: true, composeEnvironment: true },
            });
        });

        it('maps the names and the moment of the read into the domain cache', async () => {
            mockRepository.findOne.mockResolvedValue(serviceEntity());

            expect(await sut.findByService(serviceId)).toEqual({
                variables: { DATABASE_URL: '', PORT: '8080' },
                refreshedAt: new Date(refreshedAt),
            });
        });

        it('returns null when GitPaaS never read the compose file of the service', async () => {
            mockRepository.findOne.mockResolvedValue(serviceEntity({ composeEnvironment: null }));

            expect(await sut.findByService(serviceId)).toBeNull();
        });

        it('returns null when the service does not exist', async () => {
            mockRepository.findOne.mockResolvedValue(null);

            expect(await sut.findByService(serviceId)).toBeNull();
        });
    });

    describe('forgetName', () => {
        it('writes the cache without the dropped name, and keeps the moment of the read', async () => {
            mockRepository.findOne.mockResolvedValue(serviceEntity());

            await sut.forgetName(serviceId, 'PORT');

            expect(mockRepository.update).toHaveBeenCalledTimes(1);
            expect(mockRepository.update).toHaveBeenCalledWith(serviceId, {
                composeEnvironment: { variables: { DATABASE_URL: '' }, refreshedAt },
            });
        });

        it('never writes when the cache holds no such name', async () => {
            mockRepository.findOne.mockResolvedValue(serviceEntity());

            await sut.forgetName(serviceId, 'ABSENT');

            expect(mockRepository.update).not.toHaveBeenCalled();
        });

        it('never writes when the service holds no cache', async () => {
            mockRepository.findOne.mockResolvedValue(serviceEntity({ composeEnvironment: null }));

            await sut.forgetName(serviceId, 'PORT');

            expect(mockRepository.update).not.toHaveBeenCalled();
        });
    });
});
