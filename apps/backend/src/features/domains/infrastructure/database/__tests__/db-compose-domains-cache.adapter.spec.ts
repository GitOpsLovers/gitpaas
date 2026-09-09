import { Repository } from 'typeorm';

import { DatabaseComposeDomainsCacheAdapter } from '../db-compose-domains-cache.adapter';

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
    composeEnvironment: null,
    composeDomains: {
        domains: [{
            host: 'api.example.com', targetService: 'api', port: 3000, https: true,
        }],
        refreshedAt,
    },
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    ...overrides,
});

describe('DatabaseComposeDomainsCacheAdapter', () => {
    let mockRepository: jest.Mocked<Pick<Repository<DbServiceEntity>, 'findOne'>>;
    let sut: DatabaseComposeDomainsCacheAdapter;

    beforeEach(() => {
        jest.clearAllMocks();

        mockRepository = { findOne: jest.fn() };
        sut = new DatabaseComposeDomainsCacheAdapter(
            mockRepository as unknown as Repository<DbServiceEntity>,
        );
    });

    it('reads the cache of the named service alone', async () => {
        mockRepository.findOne.mockResolvedValue(serviceEntity());

        await sut.findByService(serviceId);

        expect(mockRepository.findOne).toHaveBeenCalledTimes(1);
        expect(mockRepository.findOne).toHaveBeenCalledWith({
            where: { id: serviceId },
            select: { id: true, composeDomains: true },
        });
    });

    it('maps the declarations and the moment of the read into the domain cache', async () => {
        mockRepository.findOne.mockResolvedValue(serviceEntity());

        expect(await sut.findByService(serviceId)).toEqual({
            domains: [{
                host: 'api.example.com', targetService: 'api', port: 3000, https: true,
            }],
            refreshedAt: new Date(refreshedAt),
        });
    });

    it('returns null when GitPaaS never read the compose file of the service', async () => {
        mockRepository.findOne.mockResolvedValue(serviceEntity({ composeDomains: null }));

        expect(await sut.findByService(serviceId)).toBeNull();
    });

    it('returns null when the service does not exist', async () => {
        mockRepository.findOne.mockResolvedValue(null);

        expect(await sut.findByService(serviceId)).toBeNull();
    });

    it('propagates an error of the repository', async () => {
        const error = new Error('db unreachable');
        mockRepository.findOne.mockRejectedValue(error);

        await expect(sut.findByService(serviceId)).rejects.toThrow(error);
    });
});
