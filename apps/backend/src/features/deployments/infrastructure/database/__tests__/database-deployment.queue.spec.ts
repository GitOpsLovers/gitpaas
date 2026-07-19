import { firstValueFrom } from 'rxjs';
import { In, Repository } from 'typeorm';

import { DeploymentRunTask } from '../../../domain/models/deployment-run-task.model';
import { QueuedDeploymentTask } from '../../../domain/models/queued-deployment-task.model';
import { MAX_ATTEMPTS } from '../../../domain/queues/deployment.queue';
import { DeploymentsRepository } from '../../../domain/repositories/deployments.repository';
import { DatabaseDeploymentQueue } from '../database-deployment.queue';
import { DeploymentQueueTaskDbEntity } from '../deployment-queue-task-db.entity';
import { toQueuedDeploymentTask } from '../deployment-queue-task-db.transformer';

/**
 * Builds a queue task entity fixture, overriding only the fields under test.
 */
function entity(overrides: Partial<DeploymentQueueTaskDbEntity> = {}): DeploymentQueueTaskDbEntity {
    return {
        id: 'q-1',
        deploymentId: '9c858901-8a57-4791-81fe-4c455b099bc9',
        repositoryId: 42,
        commit: '2b8c1f0a9e4d7c6b5a4f3e2d1c0b9a8f7e6d5c4b',
        composerPath: 'docker-compose.yml',
        projectName: 'gitpaas',
        status: 'queued',
        attempts: 0,
        lastError: null,
        createdAt: new Date('2026-07-11T00:00:00.000Z'),
        updatedAt: new Date('2026-07-11T00:00:00.000Z'),
        ...overrides,
    };
}

const runTask: DeploymentRunTask = {
    deploymentId: '9c858901-8a57-4791-81fe-4c455b099bc9',
    repositoryId: 42,
    commit: '2b8c1f0a9e4d7c6b5a4f3e2d1c0b9a8f7e6d5c4b',
    composerPath: 'docker-compose.yml',
    projectName: 'gitpaas',
};

describe('DatabaseDeploymentQueue', () => {
    let mockRepo: {
        create: jest.Mock;
        save: jest.Mock;
        update: jest.Mock;
        increment: jest.Mock;
        delete: jest.Mock;
        findOneBy: jest.Mock;
        find: jest.Mock;
    };
    let deploymentsRepository: jest.Mocked<DeploymentsRepository>;
    let sut: DatabaseDeploymentQueue;

    beforeEach(() => {
        mockRepo = {
            create: jest.fn(),
            save: jest.fn(),
            update: jest.fn(),
            increment: jest.fn(),
            delete: jest.fn(),
            findOneBy: jest.fn(),
            find: jest.fn(),
        };
        deploymentsRepository = {
            getAllByService: jest.fn(),
            findById: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
        };
        sut = new DatabaseDeploymentQueue(
            mockRepo as unknown as Repository<DeploymentQueueTaskDbEntity>,
            deploymentsRepository,
        );
    });

    describe('enqueue', () => {
        it('persists a queued row and emits the saved task on dequeued$', async () => {
            const created = entity();
            const saved = entity({ id: 'q-saved' });
            mockRepo.create.mockReturnValue(created);
            mockRepo.save.mockResolvedValue(saved);

            const emitted = firstValueFrom(sut.dequeued$);
            await sut.enqueue(runTask);

            expect(mockRepo.create).toHaveBeenCalledWith({ ...runTask, status: 'queued', attempts: 0 });
            expect(mockRepo.save).toHaveBeenCalledWith(created);
            expect(await emitted).toEqual(toQueuedDeploymentTask(saved));
        });
    });

    describe('markProcessing', () => {
        it('sets the row processing and increments its attempt counter', async () => {
            await sut.markProcessing('q-1');

            expect(mockRepo.update).toHaveBeenCalledWith('q-1', { status: 'processing' });
            expect(mockRepo.increment).toHaveBeenCalledWith({ id: 'q-1' }, 'attempts', 1);
        });
    });

    describe('markCompleted', () => {
        it('deletes the queue row', async () => {
            await sut.markCompleted('q-1');

            expect(mockRepo.delete).toHaveBeenCalledWith('q-1');
        });
    });

    describe('markFailed', () => {
        it('does nothing when the row no longer exists', async () => {
            mockRepo.findOneBy.mockResolvedValue(null);

            await sut.markFailed('missing', 'boom');

            expect(mockRepo.save).not.toHaveBeenCalled();
            expect(deploymentsRepository.update).not.toHaveBeenCalled();
        });

        it('re-queues and re-emits the task while attempts remain, recording the error', async () => {
            const existing = entity({ status: 'processing', attempts: MAX_ATTEMPTS - 1 });
            mockRepo.findOneBy.mockResolvedValue(existing);
            mockRepo.save.mockImplementation((task: DeploymentQueueTaskDbEntity) => Promise.resolve(task));

            const emitted = firstValueFrom(sut.dequeued$);
            await sut.markFailed('q-1', 'boom');

            expect(existing.lastError).toBe('boom');
            expect(existing.status).toBe('queued');
            expect(mockRepo.save).toHaveBeenCalledWith(existing);
            expect(await emitted).toEqual(toQueuedDeploymentTask(existing));
            expect(deploymentsRepository.update).not.toHaveBeenCalled();
        });

        it('dead-letters the row and fails the deployment once attempts are exhausted', async () => {
            const existing = entity({ status: 'processing', attempts: MAX_ATTEMPTS });
            mockRepo.findOneBy.mockResolvedValue(existing);
            mockRepo.save.mockImplementation((task: DeploymentQueueTaskDbEntity) => Promise.resolve(task));

            const emissions: QueuedDeploymentTask[] = [];
            const subscription = sut.dequeued$.subscribe((task) => emissions.push(task));

            await sut.markFailed('q-1', 'boom');
            subscription.unsubscribe();

            expect(existing.status).toBe('failed');
            expect(existing.lastError).toBe('boom');
            expect(mockRepo.save).toHaveBeenCalledWith(existing);
            expect(deploymentsRepository.update).toHaveBeenCalledWith(existing.deploymentId, {
                status: 'failed',
                error: 'boom',
            });
            expect(emissions).toEqual([]);
        });
    });

    describe('recoverPending', () => {
        it('resets queued/processing rows to queued and re-emits each in order', async () => {
            const first = entity({ id: 'q-1', status: 'processing', projectName: 'a' });
            const second = entity({ id: 'q-2', status: 'queued', projectName: 'b' });
            mockRepo.find.mockResolvedValue([first, second]);
            mockRepo.save.mockImplementation((task: DeploymentQueueTaskDbEntity) => Promise.resolve(task));

            const emissions: QueuedDeploymentTask[] = [];
            const subscription = sut.dequeued$.subscribe((task) => emissions.push(task));

            await sut.recoverPending();
            subscription.unsubscribe();

            expect(mockRepo.find).toHaveBeenCalledWith({
                where: { status: In(['queued', 'processing']) },
                order: { createdAt: 'ASC' },
            });
            expect(first.status).toBe('queued');
            expect(second.status).toBe('queued');
            expect(mockRepo.save).toHaveBeenNthCalledWith(1, first);
            expect(mockRepo.save).toHaveBeenNthCalledWith(2, second);
            expect(emissions).toEqual([
                toQueuedDeploymentTask(first),
                toQueuedDeploymentTask(second),
            ]);
        });

        it('emits nothing when there is no pending work', async () => {
            mockRepo.find.mockResolvedValue([]);

            const emissions: QueuedDeploymentTask[] = [];
            const subscription = sut.dequeued$.subscribe((task) => emissions.push(task));

            await sut.recoverPending();
            subscription.unsubscribe();

            expect(mockRepo.save).not.toHaveBeenCalled();
            expect(emissions).toEqual([]);
        });
    });
});
