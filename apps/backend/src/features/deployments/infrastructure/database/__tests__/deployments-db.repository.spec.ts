import { Repository } from 'typeorm';

import { CreateDeploymentDto } from '../../../domain/dtos/create-deployment.dto';
import { UpdateDeploymentDto } from '../../../domain/dtos/update-deployment.dto';
import { DeploymentDbEntity } from '../deployment-db.entity';
import { DeploymentsDatabaseRepository } from '../deployments-db.repository';

/**
 * Builds a deployment database-entity fixture, overriding only the fields under test.
 */
const deploymentEntity = (overrides: Partial<DeploymentDbEntity> = {}): DeploymentDbEntity => ({
    id: '9c858901-8a57-4791-81fe-4c455b099bc9',
    serviceId: '3f2504e0-4f89-41d3-9a0c-0305e82c3301',
    status: 'pending',
    branch: 'main',
    commit: '2b8c1f0a9e4d7c6b5a4f3e2d1c0b9a8f7e6d5c4b',
    commitMessage: 'Fix deployment healthcheck parsing',
    composerPath: 'docker-compose.yml',
    triggeredBy: 'system',
    error: null,
    createdAt: new Date('2026-07-11T00:00:00.000Z'),
    finishedAt: null,
    ...overrides,
});

describe('DeploymentsDatabaseRepository', () => {
    const createDto: CreateDeploymentDto = {
        serviceId: '3f2504e0-4f89-41d3-9a0c-0305e82c3301',
        branch: 'main',
        commit: '2b8c1f0a9e4d7c6b5a4f3e2d1c0b9a8f7e6d5c4b',
        commitMessage: 'Fix deployment healthcheck parsing',
        composerPath: 'docker-compose.yml',
        triggeredBy: 'system',
    };

    let mockRepository: jest.Mocked<
        Pick<Repository<DeploymentDbEntity>, 'find' | 'findOneBy' | 'create' | 'save' | 'delete'>
    >;
    let sut: DeploymentsDatabaseRepository;

    beforeEach(() => {
        jest.clearAllMocks();

        mockRepository = {
            find: jest.fn(),
            findOneBy: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            delete: jest.fn(),
        };
        sut = new DeploymentsDatabaseRepository(
            mockRepository as unknown as Repository<DeploymentDbEntity>,
        );
    });

    describe('getAllByService', () => {
        it('finds deployments for the service ordered by newest first and maps them to domain', async () => {
            const serviceId = '3f2504e0-4f89-41d3-9a0c-0305e82c3301';
            const entity = deploymentEntity();
            mockRepository.find.mockResolvedValue([entity]);

            const result = await sut.getAllByService(serviceId);

            expect(mockRepository.find).toHaveBeenCalledTimes(1);
            expect(mockRepository.find).toHaveBeenCalledWith({
                where: { serviceId },
                order: { createdAt: 'DESC' },
            });
            expect(result).toEqual([entity]);
        });

        it('returns an empty list when the service has no deployments', async () => {
            mockRepository.find.mockResolvedValue([]);

            const result = await sut.getAllByService('service-1');

            expect(mockRepository.find).toHaveBeenCalledTimes(1);
            expect(result).toEqual([]);
        });
    });

    describe('findById', () => {
        it('finds a deployment by id and maps it into the domain model', async () => {
            const found = deploymentEntity();
            mockRepository.findOneBy.mockResolvedValue(found);

            const result = await sut.findById(found.id);

            expect(mockRepository.findOneBy).toHaveBeenCalledWith({ id: found.id });
            expect(result).toEqual(found);
        });

        it('returns null when no deployment matches the id', async () => {
            mockRepository.findOneBy.mockResolvedValue(null);

            const result = await sut.findById('missing-id');

            expect(result).toBeNull();
        });
    });

    describe('create', () => {
        it('creates a pending entity from the DTO, saves it, and returns the mapped deployment', async () => {
            const entity = deploymentEntity();
            const saved = deploymentEntity();
            mockRepository.create.mockReturnValue(entity);
            mockRepository.save.mockResolvedValue(saved);

            const result = await sut.create(createDto);

            expect(mockRepository.create).toHaveBeenCalledWith({ ...createDto, status: 'pending' });
            expect(mockRepository.save).toHaveBeenCalledWith(entity);
            expect(result).toEqual(saved);
        });
    });

    describe('update', () => {
        it('returns null and does not save when the deployment is not found', async () => {
            mockRepository.findOneBy.mockResolvedValue(null);

            const result = await sut.update('missing-id', { status: 'running' });

            expect(result).toBeNull();
            expect(mockRepository.save).not.toHaveBeenCalled();
        });

        it('sets a non-terminal status with an explicit error and a null finishedAt', async () => {
            const existing = deploymentEntity();
            mockRepository.findOneBy.mockResolvedValue(existing);
            mockRepository.save.mockImplementation((entity) => Promise.resolve(entity as DeploymentDbEntity));

            const updateDto: UpdateDeploymentDto = { status: 'running', error: 'boom' };
            const result = await sut.update(existing.id, updateDto);

            expect(existing.status).toBe('running');
            expect(existing.error).toBe('boom');
            expect(existing.finishedAt).toBeNull();
            expect(mockRepository.save).toHaveBeenCalledWith(existing);
            expect(result).toEqual(existing);
        });

        it('coerces an absent error to null for a non-terminal status', async () => {
            const existing = deploymentEntity({ error: 'previous error' });
            mockRepository.findOneBy.mockResolvedValue(existing);
            mockRepository.save.mockImplementation((entity) => Promise.resolve(entity as DeploymentDbEntity));

            await sut.update(existing.id, { status: 'running' });

            expect(existing.error).toBeNull();
            expect(existing.finishedAt).toBeNull();
        });

        it('sets finishedAt to a Date for the terminal "success" status', async () => {
            const existing = deploymentEntity();
            mockRepository.findOneBy.mockResolvedValue(existing);
            mockRepository.save.mockImplementation((entity) => Promise.resolve(entity as DeploymentDbEntity));

            const result = await sut.update(existing.id, { status: 'success' });

            expect(existing.status).toBe('success');
            expect(existing.error).toBeNull();
            expect(existing.finishedAt).toBeInstanceOf(Date);
            expect(mockRepository.save).toHaveBeenCalledWith(existing);
            expect(result).toEqual(existing);
        });

        it('sets finishedAt to a Date and keeps the error for the terminal "failed" status', async () => {
            const existing = deploymentEntity();
            mockRepository.findOneBy.mockResolvedValue(existing);
            mockRepository.save.mockImplementation((entity) => Promise.resolve(entity as DeploymentDbEntity));

            await sut.update(existing.id, { status: 'failed', error: 'deploy crashed' });

            expect(existing.status).toBe('failed');
            expect(existing.error).toBe('deploy crashed');
            expect(existing.finishedAt).toBeInstanceOf(Date);
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

            const result = await sut.delete('some-id');

            expect(result).toBe(false);
        });

        it('returns false when affected is undefined', async () => {
            mockRepository.delete.mockResolvedValue({ affected: undefined, raw: [] });

            const result = await sut.delete('some-id');

            expect(result).toBe(false);
        });
    });
});
