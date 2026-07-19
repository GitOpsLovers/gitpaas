import { Test } from '@nestjs/testing';
import { Subject } from 'rxjs';

import { runDeploymentUseCase } from '../../../application/run-deployment.use-case';
import { QueuedDeploymentTask } from '../../../domain/models/queued-deployment-task.model';
import { DeploymentQueue } from '../../../domain/queues/deployment.queue';
import { DatabaseDeploymentQueue } from '../../../infrastructure/database/database-deployment.queue';
import { DeploymentsDatabaseRepository } from '../../../infrastructure/database/deployments-db.repository';
import { DockerodeDockerExecutor } from '../../../infrastructure/docker/dockerode-docker.executor';
import { DeploymentRunnerService } from '../deployment-runner.service';

import { DiagnosticLoggerService } from '@core/ui/services/diagnostic-logger.service';
import { PersistentLogStoreRepository } from '@features/logs/infrastructure/log-store/persistent-log-store.repository';
import { GithubAppProvider } from '@features/providers/infrastructure/github/github-app.provider';

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
};

/** Builds a queued task deriving unique ids from the given project name. */
const taskFor = (projectName: string, id: string, deploymentId: string): QueuedDeploymentTask => ({
    ...task,
    id,
    deploymentId,
    projectName,
});

describe('DeploymentRunnerService', () => {
    let mockDeploymentsRepository: jest.Mocked<DeploymentsDatabaseRepository>;
    let mockProvidersRepository: jest.Mocked<GithubAppProvider>;
    let mockDockerExecutor: jest.Mocked<DockerodeDockerExecutor>;
    let mockLogStore: jest.Mocked<PersistentLogStoreRepository>;
    let dequeued: Subject<QueuedDeploymentTask>;
    let mockQueue: jest.Mocked<DeploymentQueue>;
    let mockDiagnostics: jest.Mocked<Pick<DiagnosticLoggerService, 'error'>>;
    let sut: DeploymentRunnerService;

    beforeEach(async () => {
        jest.clearAllMocks();

        mockDeploymentsRepository = {} as jest.Mocked<DeploymentsDatabaseRepository>;
        mockProvidersRepository = {} as jest.Mocked<GithubAppProvider>;
        mockDockerExecutor = {} as jest.Mocked<DockerodeDockerExecutor>;
        mockLogStore = {} as jest.Mocked<PersistentLogStoreRepository>;
        dequeued = new Subject<QueuedDeploymentTask>();
        mockQueue = {
            dequeued$: dequeued.asObservable(),
            enqueue: jest.fn().mockResolvedValue(undefined),
            markProcessing: jest.fn().mockResolvedValue(undefined),
            markCompleted: jest.fn().mockResolvedValue(undefined),
            markFailed: jest.fn().mockResolvedValue(undefined),
            recoverPending: jest.fn().mockResolvedValue(undefined),
        };
        mockDiagnostics = { error: jest.fn() };

        const moduleRef = await Test.createTestingModule({
            providers: [
                DeploymentRunnerService,
                { provide: DeploymentsDatabaseRepository, useValue: mockDeploymentsRepository },
                { provide: GithubAppProvider, useValue: mockProvidersRepository },
                { provide: DockerodeDockerExecutor, useValue: mockDockerExecutor },
                { provide: PersistentLogStoreRepository, useValue: mockLogStore },
                { provide: DatabaseDeploymentQueue, useValue: mockQueue },
                { provide: DiagnosticLoggerService, useValue: mockDiagnostics },
            ],
        }).compile();

        sut = moduleRef.get(DeploymentRunnerService);
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
            mockProvidersRepository,
            mockDockerExecutor,
            mockLogStore,
            task,
        );
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

    it('marks the row failed and logs a diagnostic when the run unexpectedly throws', async () => {
        mockRunDeploymentUseCase.mockRejectedValue(new Error('boom'));
        await sut.onModuleInit();

        dequeued.next(task);
        await flush();

        expect(mockDiagnostics.error).toHaveBeenCalledTimes(1);
        expect(mockQueue.markFailed).toHaveBeenCalledTimes(1);
        expect(mockQueue.markFailed).toHaveBeenCalledWith(task.id, 'boom');
        expect(mockQueue.markCompleted).not.toHaveBeenCalled();
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
            mockProvidersRepository,
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
            mockProvidersRepository,
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
            mockProvidersRepository,
            mockDockerExecutor,
            mockLogStore,
            taskA,
        );
        expect(mockRunDeploymentUseCase).toHaveBeenNthCalledWith(
            2,
            mockDeploymentsRepository,
            mockProvidersRepository,
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

        expect(mockDiagnostics.error).toHaveBeenCalledTimes(1);
        expect(mockQueue.markFailed).toHaveBeenCalledWith(taskA.id, 'boom');
        expect(mockRunDeploymentUseCase).toHaveBeenCalledTimes(2);
        expect(mockRunDeploymentUseCase).toHaveBeenLastCalledWith(
            mockDeploymentsRepository,
            mockProvidersRepository,
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
        expect(mockDiagnostics.error).toHaveBeenCalledTimes(1);

        healthy.resolve(undefined);
        await flush();

        expect(mockDiagnostics.error).toHaveBeenCalledTimes(1);
    });
});
