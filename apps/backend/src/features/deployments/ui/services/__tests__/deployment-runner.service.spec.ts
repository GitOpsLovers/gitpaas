import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { Subject } from 'rxjs';

import { runDeploymentUseCase } from '../../../application/run-deployment.use-case';
import { ServiceNotDeployableError } from '../../../domain/errors/deployment.errors';
import { QueuedDeploymentTask } from '../../../domain/models/queued-deployment-task.models';
import { DeploymentQueue, MAX_ATTEMPTS } from '../../../domain/ports/deployment-queue.port';
import { DatabaseDeploymentQueueAdapter } from '../../../infrastructure/database/db-deployment-queue.adapter';
import { DatabaseDeploymentsRepository } from '../../../infrastructure/database/db-deployments.repository';
import { DockerExecutorAdapter } from '../../../infrastructure/docker/docker-executor.adapter';
import { DeploymentRunnerService } from '../deployment-runner.service';

import { TELEMETRY_MAX_STACK_LENGTH } from '@core/domain/constants/telemetry.constants';
import type { TelemetryEvent } from '@core/domain/models/telemetry.models';
import type { AppLogger } from '@core/domain/ports/app-logger.port';
import type { TelemetryWriter } from '@core/domain/ports/telemetry-writer.port';
import { NestLoggerAdapter } from '@core/infrastructure/logging/nest-logger.adapter';
import { resetServiceVersionCache } from '@core/infrastructure/telemetry/resolve-service-version';
import { StdoutTelemetryWriterAdapter } from '@core/infrastructure/telemetry/stdout-telemetry-writer.adapter';
import { recordDependencyCall } from '@core/infrastructure/telemetry/telemetry-deps';
import { RedisLogStoreAdapter } from '@features/logs/infrastructure/redis/redis-log-store.adapter';
import { DatabaseServicesRepository } from '@features/services/infrastructure/database/db-services.repository';
import { DatabaseProvidersRepository } from '@features/providers/infrastructure/database/db-providers.repository';
import { GithubProviderClientAdapter } from '@features/providers/infrastructure/github/github-provider-client.adapter';

jest.mock('../../../application/run-deployment.use-case');

const mockRunDeploymentUseCase = runDeploymentUseCase as jest.MockedFunction<typeof runDeploymentUseCase>;

/** Resolves after pending microtasks, letting the fire-and-forget run settle. */
const flush = (): Promise<void> =>
    // Block body: a Promise executor's return value is ignored, and an expression
    // body would implicitly return the NodeJS.Immediate handle from setImmediate,
    // tripping the no-promise-executor-return rule. Keep the braces to return nothing.
    new Promise<void>((resolve) => {
        setImmediate(resolve);
    });

interface Deferred<T> {
    promise: Promise<T>;
    resolve: (value: T) => void;
    reject: (reason?: unknown) => void;
}

/** Externally controllable promise, used to gate the use-case boundary. */
const defer = <T = void>(): Deferred<T> => {
    let resolve!: (value: T) => void;
    let reject!: (reason?: unknown) => void;
    const promise = new Promise<T>((res, rej) => {
        resolve = res;
        reject = rej;
    });

    return { promise, resolve, reject };
};

const task: QueuedDeploymentTask = {
    id: 'task-1',
    deploymentId: '9c858901-8a57-4791-81fe-4c455b099bc9',
    repositoryId: 42,
    commit: '2b8c1f0a9e4d7c6b5a4f3e2d1c0b9a8f7e6d5c4b',
    composerPath: 'docker-compose.yml',
    projectName: 'gitpaas',
    status: 'queued',
    attempts: 0,
    parentRequestId: null,
};

/** Builds a queued task deriving unique ids from the given project name. */
const taskFor = (projectName: string, id: string, deploymentId: string): QueuedDeploymentTask => ({
    ...task,
    id,
    deploymentId,
    projectName,
});

describe('DeploymentRunnerService', () => {
    let mockDeploymentsRepository: jest.Mocked<DatabaseDeploymentsRepository>;
    let mockServicesRepository: jest.Mocked<DatabaseServicesRepository>;
    let mockProvidersRepository: jest.Mocked<DatabaseProvidersRepository>;
    let mockProviderClient: jest.Mocked<GithubProviderClientAdapter>;
    let mockDockerExecutor: jest.Mocked<DockerExecutorAdapter>;
    let mockLogStore: jest.Mocked<RedisLogStoreAdapter>;
    let dequeued: Subject<QueuedDeploymentTask>;
    let mockQueue: jest.Mocked<DeploymentQueue>;
    let mockLogger: jest.Mocked<Pick<AppLogger, 'error'>>;
    let mockTelemetryWriter: jest.Mocked<Pick<TelemetryWriter, 'emit'>>;
    let sut: DeploymentRunnerService;

    /** Single telemetry event the runner emitted for a run, failing loudly when none was. */
    const emittedEvent = (index = 0): TelemetryEvent => {
        // eslint-disable-next-line security/detect-object-injection
        const call = mockTelemetryWriter.emit.mock.calls[index];

        if (call === undefined) {
            throw new Error(`No telemetry event was emitted at index ${index}`);
        }

        return call[0];
    };

    beforeEach(async () => {
        jest.clearAllMocks();
        resetServiceVersionCache();

        mockDeploymentsRepository = {} as jest.Mocked<DatabaseDeploymentsRepository>;
        mockServicesRepository = {} as jest.Mocked<DatabaseServicesRepository>;
        mockProvidersRepository = {} as jest.Mocked<DatabaseProvidersRepository>;
        mockProviderClient = {} as jest.Mocked<GithubProviderClientAdapter>;
        mockDockerExecutor = {} as jest.Mocked<DockerExecutorAdapter>;
        mockLogStore = {} as jest.Mocked<RedisLogStoreAdapter>;
        dequeued = new Subject<QueuedDeploymentTask>();
        mockQueue = {
            dequeued$: dequeued.asObservable(),
            enqueue: jest.fn().mockResolvedValue(undefined),
            markProcessing: jest.fn().mockResolvedValue(undefined),
            markCompleted: jest.fn().mockResolvedValue(undefined),
            markFailed: jest.fn().mockResolvedValue(undefined),
            recoverPending: jest.fn().mockResolvedValue(undefined),
        };
        mockLogger = { error: jest.fn() };
        mockTelemetryWriter = { emit: jest.fn() };

        const moduleRef = await Test.createTestingModule({
            providers: [
                DeploymentRunnerService,
                { provide: DatabaseDeploymentsRepository, useValue: mockDeploymentsRepository },
                { provide: DatabaseServicesRepository, useValue: mockServicesRepository },
                { provide: DatabaseProvidersRepository, useValue: mockProvidersRepository },
                { provide: GithubProviderClientAdapter, useValue: mockProviderClient },
                { provide: DockerExecutorAdapter, useValue: mockDockerExecutor },
                { provide: RedisLogStoreAdapter, useValue: mockLogStore },
                { provide: DatabaseDeploymentQueueAdapter, useValue: mockQueue },
                { provide: NestLoggerAdapter, useValue: mockLogger },
                { provide: StdoutTelemetryWriterAdapter, useValue: mockTelemetryWriter },
                {
                    provide: ConfigService,
                    useValue: { get: jest.fn((_key: string, fallback: number) => fallback) },
                },
            ],
        }).compile();

        sut = moduleRef.get(DeploymentRunnerService);
    });

    afterEach(() => {
        resetServiceVersionCache();
    });

    it('recovers pending work once, after the subscription is established', async () => {
        await sut.onModuleInit();

        expect(mockQueue.recoverPending).toHaveBeenCalledTimes(1);
    });

    it('runs the deployment use case for each request emitted after init', async () => {
        mockRunDeploymentUseCase.mockResolvedValue(undefined);
        await sut.onModuleInit();

        dequeued.next(task);
        await flush();

        expect(mockRunDeploymentUseCase).toHaveBeenCalledTimes(1);
        expect(mockRunDeploymentUseCase).toHaveBeenCalledWith(
            mockDeploymentsRepository,
            mockServicesRepository,
            mockProvidersRepository,
            mockProviderClient,
            mockDockerExecutor,
            mockLogStore,
            task,
        );
    });

    it('threads the services and providers repositories so the run can load the credentials of the provider', async () => {
        mockRunDeploymentUseCase.mockResolvedValue(undefined);
        await sut.onModuleInit();

        dequeued.next(task);
        await flush();

        const [, servicesRepository, providersRepository] = mockRunDeploymentUseCase.mock.calls[0]!;

        expect(servicesRepository).toBe(mockServicesRepository);
        expect(providersRepository).toBe(mockProvidersRepository);
    });

    it('marks the row processing before the run and completed on normal return', async () => {
        mockRunDeploymentUseCase.mockResolvedValue(undefined);
        await sut.onModuleInit();

        dequeued.next(task);
        await flush();

        expect(mockQueue.markProcessing).toHaveBeenCalledTimes(1);
        expect(mockQueue.markProcessing).toHaveBeenCalledWith(task.id);
        expect(mockQueue.markCompleted).toHaveBeenCalledTimes(1);
        expect(mockQueue.markCompleted).toHaveBeenCalledWith(task.id);
        expect(mockQueue.markFailed).not.toHaveBeenCalled();
    });

    it('emits one successful deployment.run event carrying the seed of the task', async () => {
        mockRunDeploymentUseCase.mockResolvedValue(undefined);
        await sut.onModuleInit();

        dequeued.next(task);
        await flush();

        expect(mockTelemetryWriter.emit).toHaveBeenCalledTimes(1);
        expect(emittedEvent()).toEqual(
            expect.objectContaining({
                'event.name': 'deployment.run',
                'deployment.status': 'success',
                'trace.id': task.id,
                'task.id': task.id,
                'deployment.id': task.deploymentId,
                'deployment.commit': task.commit,
                'deployment.compose_path': task.composerPath,
                'deployment.attempt': 1,
                'docker.project': task.projectName,
                'task.duration_ms': expect.any(Number),
                timestamp: expect.any(String),
            }),
        );
        expect(Object.keys(emittedEvent())).not.toContain('error.message');
    });

    it('records the sampling decision that always keeps a deployment run', async () => {
        mockRunDeploymentUseCase.mockResolvedValue(undefined);
        await sut.onModuleInit();

        dequeued.next(task);
        await flush();

        expect(emittedEvent()['sampling.kept_reason']).toBe('deployment');
        expect(emittedEvent()['sampling.rate']).toBe(1);
    });

    it('keeps a failed run carrying no error code as a deployment', async () => {
        mockRunDeploymentUseCase.mockRejectedValue(new Error('boom'));
        await sut.onModuleInit();

        dequeued.next(task);
        await flush();

        expect(mockTelemetryWriter.emit).toHaveBeenCalledTimes(1);
        expect(emittedEvent()['sampling.kept_reason']).toBe('deployment');
        expect(emittedEvent()['sampling.rate']).toBe(1);
    });

    it('keeps a failed run carrying a domain error code as an error', async () => {
        mockRunDeploymentUseCase.mockRejectedValue(new ServiceNotDeployableError());
        await sut.onModuleInit();

        dequeued.next(task);
        await flush();

        expect(mockTelemetryWriter.emit).toHaveBeenCalledTimes(1);
        expect(emittedEvent()['sampling.kept_reason']).toBe('error');
        expect(emittedEvent()['sampling.rate']).toBe(1);
    });

    it('correlates the run with the request that enqueued the task', async () => {
        mockRunDeploymentUseCase.mockResolvedValue(undefined);
        await sut.onModuleInit();

        dequeued.next({ ...task, parentRequestId: 'req-7' });
        await flush();

        expect(emittedEvent()['trace.id']).toBe('req-7');
        expect(emittedEvent()['parent.request_id']).toBe('req-7');
    });

    it('publishes the dependency counters recorded while the run was in flight', async () => {
        // eslint-disable-next-line @typescript-eslint/require-await
        mockRunDeploymentUseCase.mockImplementation(async () => {
            recordDependencyCall('docker', 12, false);
            recordDependencyCall('github', 8, true);
        });
        await sut.onModuleInit();

        dequeued.next(task);
        await flush();

        expect(emittedEvent()).toEqual(
            expect.objectContaining({
                'deps.docker.calls': 1,
                'deps.docker.duration_ms': 12,
                'deps.docker.errors': 0,
                'deps.docker.max_ms': 12,
                'deps.github.calls': 1,
                'deps.github.errors': 1,
            }),
        );
    });

    it('marks the row failed and emits a failed deployment.run event when the run throws', async () => {
        mockRunDeploymentUseCase.mockRejectedValue(new Error('boom'));
        await sut.onModuleInit();

        dequeued.next(task);
        await flush();

        expect(mockQueue.markFailed).toHaveBeenCalledTimes(1);
        expect(mockQueue.markFailed).toHaveBeenCalledWith(task.id, 'boom');
        expect(mockQueue.markCompleted).not.toHaveBeenCalled();
        expect(mockTelemetryWriter.emit).toHaveBeenCalledTimes(1);
        expect(emittedEvent()).toEqual(
            expect.objectContaining({
                'deployment.status': 'failed',
                'error.type': 'Error',
                'error.message': 'boom',
                'error.stack': expect.stringContaining('Error: boom'),
                'error.retriable': true,
            }),
        );
        // The failure now travels on the event, so no separate text line is written.
        expect(mockLogger.error).not.toHaveBeenCalled();
    });

    it('caps the stack of a failure at the telemetry limit, keeping its first frames', async () => {
        const error = new Error('boom');
        const head = 'Error: boom\n    at the frame that carries the failure\n';

        error.stack = head + 'x'.repeat(TELEMETRY_MAX_STACK_LENGTH * 2);
        mockRunDeploymentUseCase.mockRejectedValue(error);
        await sut.onModuleInit();

        dequeued.next(task);
        await flush();

        const stack = emittedEvent()['error.stack']!;

        expect(stack).toHaveLength(TELEMETRY_MAX_STACK_LENGTH);
        expect(stack.startsWith(head)).toBe(true);
        expect(stack).toMatch(/\n… \[truncated \d+ characters]$/);
    });

    it('publishes a stack shorter than the limit unchanged', async () => {
        const error = new Error('boom');

        error.stack = `Error: boom\n${'    at frame\n'.repeat(5)}`;
        mockRunDeploymentUseCase.mockRejectedValue(error);
        await sut.onModuleInit();

        dequeued.next(task);
        await flush();

        expect(emittedEvent()['error.stack']).toBe(error.stack);
    });

    it('reports the stable code of a domain failure and its own error type', async () => {
        mockRunDeploymentUseCase.mockRejectedValue(new ServiceNotDeployableError());
        await sut.onModuleInit();

        dequeued.next(task);
        await flush();

        expect(emittedEvent()['error.type']).toBe('ServiceNotDeployableError');
        expect(emittedEvent()['error.code']).toBe('SERVICE_NOT_DEPLOYABLE');
    });

    it('omits error.code and error.stack when the thrown value is not an error', async () => {
        mockRunDeploymentUseCase.mockRejectedValue('plain rejection');
        await sut.onModuleInit();

        dequeued.next(task);
        await flush();

        const keys = Object.keys(emittedEvent());

        expect(emittedEvent()['error.type']).toBe('string');
        expect(emittedEvent()['error.message']).toBe('plain rejection');
        expect(keys).not.toContain('error.code');
        expect(keys).not.toContain('error.stack');
    });

    it('reports the failure as final once the task exhausted its attempts', async () => {
        mockRunDeploymentUseCase.mockRejectedValue(new Error('boom'));
        await sut.onModuleInit();

        dequeued.next({ ...task, attempts: MAX_ATTEMPTS - 1 });
        await flush();

        expect(emittedEvent()['error.retriable']).toBe(false);
        expect(emittedEvent()['deployment.attempt']).toBe(MAX_ATTEMPTS);
    });

    it('contains a markFailed rejection and keeps draining the queue', async () => {
        const taskA = taskFor('gitpaas', 'task-a', 'deploy-a');
        const taskB = taskFor('gitpaas', 'task-b', 'deploy-b');
        const markFailedError = new Error('database down');

        mockRunDeploymentUseCase.mockRejectedValueOnce(new Error('boom'));
        mockQueue.markFailed.mockRejectedValueOnce(markFailedError);

        await sut.onModuleInit();

        dequeued.next(taskA);
        await flush();

        expect(mockTelemetryWriter.emit).toHaveBeenCalledTimes(1);
        expect(emittedEvent()).toEqual(
            expect.objectContaining({
                'task.id': taskA.id,
                'deployment.id': taskA.deploymentId,
                'deployment.status': 'failed',
                'error.type': 'Error',
                'error.message': `boom; could not mark the task failed: ${markFailedError.message}`,
            }),
        );

        // The consumer survived: the next task is still processed.
        mockRunDeploymentUseCase.mockResolvedValue(undefined);
        dequeued.next(taskB);
        await flush();

        expect(mockQueue.markCompleted).toHaveBeenCalledTimes(1);
        expect(mockQueue.markCompleted).toHaveBeenCalledWith(taskB.id);
        expect(mockTelemetryWriter.emit).toHaveBeenCalledTimes(2);
        expect(emittedEvent(1)['deployment.status']).toBe('success');
    });

    it('keeps the subscription alive when a run rejects outside its own error handling', async () => {
        const runSpy = jest
            .spyOn(sut as unknown as { run: (task: QueuedDeploymentTask) => Promise<void> }, 'run')
            .mockRejectedValueOnce(new Error('catastrophic'))
            .mockResolvedValue(undefined);

        await sut.onModuleInit();

        dequeued.next(taskFor('gitpaas', 'task-a', 'deploy-a'));
        await flush();

        expect(mockLogger.error).toHaveBeenCalledTimes(1);
        expect(mockLogger.error).toHaveBeenCalledWith(
            'Deployment runner failed unrecoverably for deploy-a: catastrophic',
            expect.any(Error),
            'DeploymentRunnerService',
        );

        dequeued.next(taskFor('gitpaas', 'task-b', 'deploy-b'));
        await flush();

        expect(runSpy).toHaveBeenCalledTimes(2);
    });

    it('stops handling requests once destroyed', async () => {
        mockRunDeploymentUseCase.mockResolvedValue(undefined);
        await sut.onModuleInit();
        sut.onModuleDestroy();

        dequeued.next(task);
        await flush();

        expect(mockRunDeploymentUseCase).not.toHaveBeenCalled();
    });

    it('serializes runs for the same project so the next waits for the current to finish', async () => {
        const first = defer();
        const second = defer();
        mockRunDeploymentUseCase
            .mockReturnValueOnce(first.promise)
            .mockReturnValueOnce(second.promise);

        const taskA = taskFor('gitpaas', 'task-a', 'deploy-a');
        const taskB = taskFor('gitpaas', 'task-b', 'deploy-b');

        await sut.onModuleInit();
        dequeued.next(taskA);
        dequeued.next(taskB);
        await flush();

        // First run is in-flight; the second must not have started yet.
        expect(mockRunDeploymentUseCase).toHaveBeenCalledTimes(1);
        expect(mockRunDeploymentUseCase).toHaveBeenLastCalledWith(
            mockDeploymentsRepository,
            mockServicesRepository,
            mockProvidersRepository,
            mockProviderClient,
            mockDockerExecutor,
            mockLogStore,
            taskA,
        );

        // Completing the first run releases the second.
        first.resolve(undefined);
        await flush();

        expect(mockRunDeploymentUseCase).toHaveBeenCalledTimes(2);
        expect(mockRunDeploymentUseCase).toHaveBeenLastCalledWith(
            mockDeploymentsRepository,
            mockServicesRepository,
            mockProvidersRepository,
            mockProviderClient,
            mockDockerExecutor,
            mockLogStore,
            taskB,
        );

        second.resolve(undefined);
        await flush();
    });

    it('runs distinct projects concurrently without waiting for each other', async () => {
        const first = defer();
        const second = defer();
        mockRunDeploymentUseCase
            .mockReturnValueOnce(first.promise)
            .mockReturnValueOnce(second.promise);

        const taskA = taskFor('project-a', 'task-a', 'deploy-a');
        const taskB = taskFor('project-b', 'task-b', 'deploy-b');

        await sut.onModuleInit();
        dequeued.next(taskA);
        dequeued.next(taskB);
        await flush();

        // Both runs are in-flight at once: the second started without the first resolving.
        expect(mockRunDeploymentUseCase).toHaveBeenCalledTimes(2);
        expect(mockRunDeploymentUseCase).toHaveBeenNthCalledWith(
            1,
            mockDeploymentsRepository,
            mockServicesRepository,
            mockProvidersRepository,
            mockProviderClient,
            mockDockerExecutor,
            mockLogStore,
            taskA,
        );
        expect(mockRunDeploymentUseCase).toHaveBeenNthCalledWith(
            2,
            mockDeploymentsRepository,
            mockServicesRepository,
            mockProvidersRepository,
            mockProviderClient,
            mockDockerExecutor,
            mockLogStore,
            taskB,
        );

        first.resolve(undefined);
        second.resolve(undefined);
        await flush();
    });

    it('keeps draining the same project after a run rejects, marking it failed', async () => {
        const first = defer();
        const second = defer();
        mockRunDeploymentUseCase
            .mockReturnValueOnce(first.promise)
            .mockReturnValueOnce(second.promise);

        const taskA = taskFor('gitpaas', 'task-a', 'deploy-a');
        const taskB = taskFor('gitpaas', 'task-b', 'deploy-b');

        await sut.onModuleInit();
        dequeued.next(taskA);
        dequeued.next(taskB);
        await flush();

        expect(mockRunDeploymentUseCase).toHaveBeenCalledTimes(1);

        // First run fails: the error is contained and the next same-project run proceeds.
        first.reject(new Error('boom'));
        await flush();

        expect(mockTelemetryWriter.emit).toHaveBeenCalledTimes(1);
        expect(emittedEvent()['deployment.status']).toBe('failed');
        expect(emittedEvent()['task.id']).toBe(taskA.id);
        expect(mockQueue.markFailed).toHaveBeenCalledWith(taskA.id, 'boom');
        expect(mockRunDeploymentUseCase).toHaveBeenCalledTimes(2);
        expect(mockRunDeploymentUseCase).toHaveBeenLastCalledWith(
            mockDeploymentsRepository,
            mockServicesRepository,
            mockProvidersRepository,
            mockProviderClient,
            mockDockerExecutor,
            mockLogStore,
            taskB,
        );

        second.resolve(undefined);
        await flush();
    });

    it('keeps other projects running after an unrelated project run rejects', async () => {
        const failing = defer();
        const healthy = defer();
        mockRunDeploymentUseCase
            .mockReturnValueOnce(failing.promise)
            .mockReturnValueOnce(healthy.promise);

        const taskA = taskFor('project-a', 'task-a', 'deploy-a');
        const taskB = taskFor('project-b', 'task-b', 'deploy-b');

        await sut.onModuleInit();
        dequeued.next(taskA);
        dequeued.next(taskB);
        await flush();

        expect(mockRunDeploymentUseCase).toHaveBeenCalledTimes(2);

        failing.reject(new Error('boom'));
        await flush();

        // The other project's run is unaffected and still resolves cleanly.
        expect(mockTelemetryWriter.emit).toHaveBeenCalledTimes(1);
        expect(emittedEvent()).toEqual(
            expect.objectContaining({ 'task.id': taskA.id, 'deployment.status': 'failed' }),
        );

        healthy.resolve(undefined);
        await flush();

        expect(mockTelemetryWriter.emit).toHaveBeenCalledTimes(2);
        expect(emittedEvent(1)).toEqual(
            expect.objectContaining({ 'task.id': taskB.id, 'deployment.status': 'success' }),
        );
        expect(mockLogger.error).not.toHaveBeenCalled();
    });
});
