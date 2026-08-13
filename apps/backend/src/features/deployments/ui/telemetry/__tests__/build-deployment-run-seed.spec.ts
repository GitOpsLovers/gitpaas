import { hostname } from 'node:os';

import { QueuedDeploymentTask } from '../../../domain/models/queued-deployment-task.models';
import { buildDeploymentRunSeed } from '../build-deployment-run-seed';

/** Builds a queued deployment task fixture, overriding only the fields under test. */
const queuedTask = (overrides: Partial<QueuedDeploymentTask> = {}): QueuedDeploymentTask => ({
    id: 'task-1',
    deploymentId: '9c858901-8a57-4791-81fe-4c455b099bc9',
    repositoryId: 42,
    commit: '2b8c1f0a9e4d7c6b5a4f3e2d1c0b9a8f7e6d5c4b',
    composerPath: 'docker-compose.yml',
    projectName: 'gitpaas',
    status: 'queued',
    attempts: 0,
    parentRequestId: null,
    ...overrides,
});

describe('buildDeploymentRunSeed', () => {
    let envBackup: NodeJS.ProcessEnv;

    beforeEach(() => {
        envBackup = { ...process.env };
    });

    afterEach(() => {
        process.env = envBackup;
    });

    it('stamps the background run event name and the service every telemetry event is attributed to', () => {
        const seed = buildDeploymentRunSeed(queuedTask());

        expect(seed['event.name']).toBe('deployment.run');
        expect(seed['service.name']).toBe('gitpaas-backend');
    });

    it('reports the build version the process was stamped with', () => {
        process.env.APP_VERSION = '1.4.2';

        expect(buildDeploymentRunSeed(queuedTask())['service.version']).toBe('1.4.2');
    });

    it('falls back to the unknown version when no build stamped one', () => {
        delete process.env.APP_VERSION;

        expect(buildDeploymentRunSeed(queuedTask())['service.version']).toBe('unknown');
    });

    it('reports the environment the process runs in', () => {
        process.env.NODE_ENV = 'production';

        expect(buildDeploymentRunSeed(queuedTask())['service.env']).toBe('production');
    });

    it('falls back to development when the environment is not set', () => {
        delete process.env.NODE_ENV;

        expect(buildDeploymentRunSeed(queuedTask())['service.env']).toBe('development');
    });

    it('stamps the host and the process the run was produced on', () => {
        const seed = buildDeploymentRunSeed(queuedTask());

        expect(seed['host.name']).toBe(hostname());
        expect(seed['process.pid']).toBe(process.pid);
    });

    it('stamps the moment the runner picked the task up as an ISO timestamp', () => {
        const seed = buildDeploymentRunSeed(queuedTask());

        expect(new Date(seed.timestamp).toISOString()).toBe(seed.timestamp);
    });

    it('continues the trace of the request that enqueued the task', () => {
        const seed = buildDeploymentRunSeed(queuedTask({ parentRequestId: 'req-7' }));

        expect(seed['trace.id']).toBe('req-7');
        expect(seed['parent.request_id']).toBe('req-7');
    });

    it('starts its own trace from the task id when no request enqueued the task', () => {
        const seed = buildDeploymentRunSeed(queuedTask({ id: 'task-9', parentRequestId: null }));

        expect(seed['trace.id']).toBe('task-9');
    });

    it('omits parent.request_id when the task carries no parent request', () => {
        const seed = buildDeploymentRunSeed(queuedTask({ parentRequestId: null }));

        expect(Object.keys(seed)).not.toContain('parent.request_id');
    });

    it('correlates the event with the queue row the run came from', () => {
        expect(buildDeploymentRunSeed(queuedTask({ id: 'q-42' }))['task.id']).toBe('q-42');
    });

    it('maps the deployment details of the task into the business context of the event', () => {
        const seed = buildDeploymentRunSeed(queuedTask());

        expect(seed['deployment.id']).toBe('9c858901-8a57-4791-81fe-4c455b099bc9');
        expect(seed['deployment.commit']).toBe('2b8c1f0a9e4d7c6b5a4f3e2d1c0b9a8f7e6d5c4b');
        expect(seed['deployment.compose_path']).toBe('docker-compose.yml');
        expect(seed['docker.project']).toBe('gitpaas');
    });

    it('reports the attempt about to run, counting from one', () => {
        expect(buildDeploymentRunSeed(queuedTask({ attempts: 0 }))['deployment.attempt']).toBe(1);
        expect(buildDeploymentRunSeed(queuedTask({ attempts: 2 }))['deployment.attempt']).toBe(3);
    });

    it('never leaks task fields the event does not declare', () => {
        const keys = Object.keys(buildDeploymentRunSeed(queuedTask()));

        expect(keys).not.toContain('repositoryId');
        expect(keys).not.toContain('status');
        expect(keys).not.toContain('attempts');
    });
});
