import { DeploymentQueueTaskDbEntity } from '../deployment-queue-task-db.entity';
import { toQueuedDeploymentTask } from '../deployment-queue-task-db.transformer';

describe('toQueuedDeploymentTask', () => {
    it('maps the queue task entity payload and bookkeeping fields into the domain model', () => {
        const entity: DeploymentQueueTaskDbEntity = {
            id: 'q-1',
            deploymentId: '9c858901-8a57-4791-81fe-4c455b099bc9',
            repositoryId: 42,
            commit: '2b8c1f0a9e4d7c6b5a4f3e2d1c0b9a8f7e6d5c4b',
            composerPath: 'docker-compose.yml',
            projectName: 'gitpaas',
            status: 'processing',
            attempts: 2,
            lastError: 'previous failure',
            createdAt: new Date('2026-07-11T00:00:00.000Z'),
            updatedAt: new Date('2026-07-11T00:01:00.000Z'),
        };

        expect(toQueuedDeploymentTask(entity)).toEqual({
            id: 'q-1',
            deploymentId: '9c858901-8a57-4791-81fe-4c455b099bc9',
            repositoryId: 42,
            commit: '2b8c1f0a9e4d7c6b5a4f3e2d1c0b9a8f7e6d5c4b',
            composerPath: 'docker-compose.yml',
            projectName: 'gitpaas',
            status: 'processing',
            attempts: 2,
        });
    });

    it('omits persistence-only columns (lastError, timestamps) from the domain model', () => {
        const entity: DeploymentQueueTaskDbEntity = {
            id: 'q-2',
            deploymentId: 'c1a2b3c4-d5e6-47f8-9a0b-1c2d3e4f5a6b',
            repositoryId: 7,
            commit: 'abc123',
            composerPath: 'compose.yaml',
            projectName: 'my-service',
            status: 'queued',
            attempts: 0,
            lastError: null,
            createdAt: new Date('2026-07-11T00:00:00.000Z'),
            updatedAt: new Date('2026-07-11T00:00:00.000Z'),
        };

        const result = toQueuedDeploymentTask(entity);

        expect(result).not.toHaveProperty('lastError');
        expect(result).not.toHaveProperty('createdAt');
        expect(result).not.toHaveProperty('updatedAt');
    });
});
