import { Repository } from 'typeorm';

import { CreateDeploymentDto } from '../../../domain/dtos/create-deployment.dto';
import { UpdateDeploymentDto } from '../../../domain/dtos/update-deployment.dto';
import { Deployment } from '../../../domain/models/deployment.model';
import { DeploymentDbEntity } from '../deployment-db.entity';
import { DeploymentsDatabaseRepository } from '../deployments-db.repository';

/**
 * Builds a deployment fixture, overriding only the fields under test.
 */
function deployment(overrides: Partial<Deployment> = {}): Deployment {
    return {
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
    };
}

describe('DeploymentsDatabaseRepository', () => {
    const createDto: CreateDeploymentDto = {
        serviceId: '3f2504e0-4f89-41d3-9a0c-0305e82c3301',
        branch: 'main',
        commit: '2b8c1f0a9e4d7c6b5a4f3e2d1c0b9a8f7e6d5c4b',
        commitMessage: 'Fix deployment healthcheck parsing',
        composerPath: 'docker-compose.yml',
        triggeredBy: 'system',
    };

    let mockRepo: {
        find: jest.Mock;
        findOneBy: jest.Mock;
        create: jest.Mock;
        save: jest.Mock;
        delete: jest.Mock;
    };
    let repository: DeploymentsDatabaseRepository;

    beforeEach(() => {
        mockRepo = {
            find: jest.fn(),
            findOneBy: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            delete: jest.fn(),
        };
        repository = new DeploymentsDatabaseRepository(
            mockRepo as unknown as Repository<DeploymentDbEntity>,
        );
    });

    describe('getAllByService', () => {
        it('finds deployments for the service ordered by newest first and returns them', async () => {
            const serviceId = '3f2504e0-4f89-41d3-9a0c-0305e82c3301';
            const deployments = [deployment()];
            mockRepo.find.mockResolvedValue(deployments);

            const result = await repository.getAllByService(serviceId);

            expect(mockRepo.find).toHaveBeenCalledTimes(1);
            expect(mockRepo.find).toHaveBeenCalledWith({
                where: { serviceId },
                order: { createdAt: 'DESC' },
            });
            expect(result).toBe(deployments);
        });
    });

    describe('findById', () => {
        it('finds a deployment by id and returns it', async () => {
            const found = deployment();
            mockRepo.findOneBy.mockResolvedValue(found);

            const result = await repository.findById(found.id);

            expect(mockRepo.findOneBy).toHaveBeenCalledWith({ id: found.id });
            expect(result).toBe(found);
        });

        it('returns null when no deployment matches the id', async () => {
            mockRepo.findOneBy.mockResolvedValue(null);

            const result = await repository.findById('missing-id');

            expect(result).toBeNull();
        });
    });

    describe('create', () => {
        it('creates a pending entity from the DTO, saves it, and returns the saved deployment', async () => {
            const entity = deployment();
            const saved = deployment();
            mockRepo.create.mockReturnValue(entity);
            mockRepo.save.mockResolvedValue(saved);

            const result = await repository.create(createDto);

            expect(mockRepo.create).toHaveBeenCalledWith({ ...createDto, status: 'pending' });
            expect(mockRepo.save).toHaveBeenCalledWith(entity);
            expect(result).toBe(saved);
        });
    });

    describe('update', () => {
        it('returns null and does not save when the deployment is not found', async () => {
            mockRepo.findOneBy.mockResolvedValue(null);

            const result = await repository.update('missing-id', { status: 'running' });

            expect(result).toBeNull();
            expect(mockRepo.save).not.toHaveBeenCalled();
        });

        it('sets a non-terminal status with an explicit error and a null finishedAt', async () => {
            const existing = deployment();
            mockRepo.findOneBy.mockResolvedValue(existing);
            mockRepo.save.mockImplementation((entity: Deployment) => Promise.resolve(entity));

            const updateDto: UpdateDeploymentDto = { status: 'running', error: 'boom' };
            const result = await repository.update(existing.id, updateDto);

            expect(existing.status).toBe('running');
            expect(existing.error).toBe('boom');
            expect(existing.finishedAt).toBeNull();
            expect(mockRepo.save).toHaveBeenCalledWith(existing);
            expect(result).toBe(existing);
        });

        it('coerces an absent error to null for a non-terminal status', async () => {
            const existing = deployment({ error: 'previous error' });
            mockRepo.findOneBy.mockResolvedValue(existing);
            mockRepo.save.mockImplementation((entity: Deployment) => Promise.resolve(entity));

            await repository.update(existing.id, { status: 'running' });

            expect(existing.error).toBeNull();
            expect(existing.finishedAt).toBeNull();
        });

        it('sets finishedAt to a Date for the terminal "success" status', async () => {
            const existing = deployment();
            mockRepo.findOneBy.mockResolvedValue(existing);
            mockRepo.save.mockImplementation((entity: Deployment) => Promise.resolve(entity));

            const result = await repository.update(existing.id, { status: 'success' });

            expect(existing.status).toBe('success');
            expect(existing.error).toBeNull();
            expect(existing.finishedAt).toBeInstanceOf(Date);
            expect(mockRepo.save).toHaveBeenCalledWith(existing);
            expect(result).toBe(existing);
        });

        it('sets finishedAt to a Date and keeps the error for the terminal "failed" status', async () => {
            const existing = deployment();
            mockRepo.findOneBy.mockResolvedValue(existing);
            mockRepo.save.mockImplementation((entity: Deployment) => Promise.resolve(entity));

            await repository.update(existing.id, { status: 'failed', error: 'deploy crashed' });

            expect(existing.status).toBe('failed');
            expect(existing.error).toBe('deploy crashed');
            expect(existing.finishedAt).toBeInstanceOf(Date);
        });
    });

    describe('delete', () => {
        it('returns true when a row was affected', async () => {
            mockRepo.delete.mockResolvedValue({ affected: 1, raw: [] });

            const result = await repository.delete('some-id');

            expect(mockRepo.delete).toHaveBeenCalledWith('some-id');
            expect(result).toBe(true);
        });

        it('returns false when no rows were affected', async () => {
            mockRepo.delete.mockResolvedValue({ affected: 0, raw: [] });

            const result = await repository.delete('some-id');

            expect(result).toBe(false);
        });

        it('returns false when affected is undefined', async () => {
            mockRepo.delete.mockResolvedValue({ affected: undefined, raw: [] });

            const result = await repository.delete('some-id');

            expect(result).toBe(false);
        });
    });
});
