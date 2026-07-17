import { runDeploymentUseCase } from '../../../application/run-deployment.use-case';
import { DeploymentsDatabaseRepository } from '../../../infrastructure/database/deployments-db.repository';
import { DockerodeDockerExecutor } from '../../../infrastructure/docker/dockerode-docker.executor';
import { RxjsDeploymentQueue } from '../../../infrastructure/rxjs/rxjs-deployment.queue';
import { DeploymentRunnerService } from '../deployment-runner.service';

import { DeploymentRunTask } from '../../../domain/models/deployment-run-task.model';
import { DiagnosticLoggerService } from '@core/ui/services/diagnostic-logger.service';
import { PersistentLogStoreRepository } from '@features/logs/infrastructure/log-store/persistent-log-store.repository';
import { GithubAppProvider } from '@features/providers/infrastructure/github/github-app.provider';

jest.mock('@features/providers/infrastructure/github/github-app.provider', () => ({
    GithubAppProvider: class GithubAppProvider {},
}));
jest.mock('@features/logs/infrastructure/log-store/persistent-log-store.repository', () => ({
    PersistentLogStoreRepository: class PersistentLogStoreRepository {},
}));
jest.mock('../../../application/run-deployment.use-case');

const runDeploymentUseCaseMock = runDeploymentUseCase as jest.MockedFunction<typeof runDeploymentUseCase>;

/** Resolves after pending microtasks, letting the fire-and-forget run settle. */
const flush = (): Promise<void> => new Promise((resolve) => setImmediate(resolve));

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

const task: DeploymentRunTask = {
    deploymentId: '9c858901-8a57-4791-81fe-4c455b099bc9',
    repositoryId: 42,
    commit: '2b8c1f0a9e4d7c6b5a4f3e2d1c0b9a8f7e6d5c4b',
    composerPath: 'docker-compose.yml',
    projectName: 'artifactory',
};

/** Builds a run task deriving unique ids from the given project name. */
const taskFor = (projectName: string, deploymentId: string): DeploymentRunTask => ({
    ...task,
    deploymentId,
    projectName,
});

describe('DeploymentRunnerService', () => {
    let deploymentsRepository: jest.Mocked<DeploymentsDatabaseRepository>;
    let providersRepository: jest.Mocked<GithubAppProvider>;
    let dockerExecutor: jest.Mocked<DockerodeDockerExecutor>;
    let logStore: jest.Mocked<PersistentLogStoreRepository>;
    let queue: RxjsDeploymentQueue;
    let diagnostics: jest.Mocked<Pick<DiagnosticLoggerService, 'error'>>;
    let sut: DeploymentRunnerService;

    beforeEach(() => {
        jest.clearAllMocks();

        deploymentsRepository = {} as jest.Mocked<DeploymentsDatabaseRepository>;
        providersRepository = {} as jest.Mocked<GithubAppProvider>;
        dockerExecutor = {} as jest.Mocked<DockerodeDockerExecutor>;
        logStore = {} as jest.Mocked<PersistentLogStoreRepository>;
        queue = new RxjsDeploymentQueue();
        diagnostics = { error: jest.fn() };

        sut = new DeploymentRunnerService(
            deploymentsRepository,
            providersRepository,
            dockerExecutor,
            logStore,
            queue,
            diagnostics as unknown as DiagnosticLoggerService,
        );
    });

    it('runs the deployment use case for each request published after init', async () => {
        runDeploymentUseCaseMock.mockResolvedValue(undefined);
        sut.onModuleInit();

        queue.enqueue(task);
        await flush();

        expect(runDeploymentUseCaseMock).toHaveBeenCalledTimes(1);
        expect(runDeploymentUseCaseMock).toHaveBeenCalledWith(
            deploymentsRepository,
            providersRepository,
            dockerExecutor,
            logStore,
            task,
        );
    });

    it('logs a diagnostic error when the run unexpectedly throws', async () => {
        runDeploymentUseCaseMock.mockRejectedValue(new Error('boom'));
        sut.onModuleInit();

        queue.enqueue(task);
        await flush();

        expect(diagnostics.error).toHaveBeenCalledTimes(1);
    });

    it('stops handling requests once destroyed', async () => {
        runDeploymentUseCaseMock.mockResolvedValue(undefined);
        sut.onModuleInit();
        sut.onModuleDestroy();

        queue.enqueue(task);
        await flush();

        expect(runDeploymentUseCaseMock).not.toHaveBeenCalled();
    });

    it('serializes runs for the same project so the next waits for the current to finish', async () => {
        const first = defer();
        const second = defer();
        runDeploymentUseCaseMock
            .mockReturnValueOnce(first.promise)
            .mockReturnValueOnce(second.promise);

        const taskA = taskFor('artifactory', 'deploy-a');
        const taskB = taskFor('artifactory', 'deploy-b');

        sut.onModuleInit();
        queue.enqueue(taskA);
        queue.enqueue(taskB);
        await flush();

        // First run is in-flight; the second must not have started yet.
        expect(runDeploymentUseCaseMock).toHaveBeenCalledTimes(1);
        expect(runDeploymentUseCaseMock).toHaveBeenLastCalledWith(
            deploymentsRepository,
            providersRepository,
            dockerExecutor,
            logStore,
            taskA,
        );

        // Completing the first run releases the second.
        first.resolve(undefined);
        await flush();

        expect(runDeploymentUseCaseMock).toHaveBeenCalledTimes(2);
        expect(runDeploymentUseCaseMock).toHaveBeenLastCalledWith(
            deploymentsRepository,
            providersRepository,
            dockerExecutor,
            logStore,
            taskB,
        );

        second.resolve(undefined);
        await flush();
    });

    it('runs distinct projects concurrently without waiting for each other', async () => {
        const first = defer();
        const second = defer();
        runDeploymentUseCaseMock
            .mockReturnValueOnce(first.promise)
            .mockReturnValueOnce(second.promise);

        const taskA = taskFor('project-a', 'deploy-a');
        const taskB = taskFor('project-b', 'deploy-b');

        sut.onModuleInit();
        queue.enqueue(taskA);
        queue.enqueue(taskB);
        await flush();

        // Both runs are in-flight at once: the second started without the first resolving.
        expect(runDeploymentUseCaseMock).toHaveBeenCalledTimes(2);
        expect(runDeploymentUseCaseMock).toHaveBeenNthCalledWith(
            1,
            deploymentsRepository,
            providersRepository,
            dockerExecutor,
            logStore,
            taskA,
        );
        expect(runDeploymentUseCaseMock).toHaveBeenNthCalledWith(
            2,
            deploymentsRepository,
            providersRepository,
            dockerExecutor,
            logStore,
            taskB,
        );

        first.resolve(undefined);
        second.resolve(undefined);
        await flush();
    });

    it('keeps draining the same project after a run rejects, logging the failure', async () => {
        const first = defer();
        const second = defer();
        runDeploymentUseCaseMock
            .mockReturnValueOnce(first.promise)
            .mockReturnValueOnce(second.promise);

        const taskA = taskFor('artifactory', 'deploy-a');
        const taskB = taskFor('artifactory', 'deploy-b');

        sut.onModuleInit();
        queue.enqueue(taskA);
        queue.enqueue(taskB);
        await flush();

        expect(runDeploymentUseCaseMock).toHaveBeenCalledTimes(1);

        // First run fails: the error is contained and the next same-project run proceeds.
        first.reject(new Error('boom'));
        await flush();

        expect(diagnostics.error).toHaveBeenCalledTimes(1);
        expect(runDeploymentUseCaseMock).toHaveBeenCalledTimes(2);
        expect(runDeploymentUseCaseMock).toHaveBeenLastCalledWith(
            deploymentsRepository,
            providersRepository,
            dockerExecutor,
            logStore,
            taskB,
        );

        second.resolve(undefined);
        await flush();
    });

    it('keeps other projects running after an unrelated project run rejects', async () => {
        const failing = defer();
        const healthy = defer();
        runDeploymentUseCaseMock
            .mockReturnValueOnce(failing.promise)
            .mockReturnValueOnce(healthy.promise);

        const taskA = taskFor('project-a', 'deploy-a');
        const taskB = taskFor('project-b', 'deploy-b');

        sut.onModuleInit();
        queue.enqueue(taskA);
        queue.enqueue(taskB);
        await flush();

        expect(runDeploymentUseCaseMock).toHaveBeenCalledTimes(2);

        failing.reject(new Error('boom'));
        await flush();

        // The other project's run is unaffected and still resolves cleanly.
        expect(diagnostics.error).toHaveBeenCalledTimes(1);

        healthy.resolve(undefined);
        await flush();

        expect(diagnostics.error).toHaveBeenCalledTimes(1);
    });
});
