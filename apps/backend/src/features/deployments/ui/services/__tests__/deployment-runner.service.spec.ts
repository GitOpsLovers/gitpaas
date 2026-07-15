import { runDeploymentUseCase } from '../../../application/run-deployment.use-case';
import { DeploymentsDatabaseRepository } from '../../../infrastructure/database/deployments-db.repository';
import { DockerodeDockerExecutor } from '../../../infrastructure/docker/dockerode-docker.executor';
import { DeploymentRunBus, DeploymentRunRequest } from '../../../infrastructure/events/deployment-run.bus';
import { DeploymentRunnerService } from '../deployment-runner.service';

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

const request: DeploymentRunRequest = {
    deploymentId: '9c858901-8a57-4791-81fe-4c455b099bc9',
    repositoryId: 42,
    commit: '2b8c1f0a9e4d7c6b5a4f3e2d1c0b9a8f7e6d5c4b',
    composerPath: 'docker-compose.yml',
    projectName: 'artifactory',
};

describe('DeploymentRunnerService', () => {
    let deploymentsRepository: jest.Mocked<DeploymentsDatabaseRepository>;
    let providersRepository: jest.Mocked<GithubAppProvider>;
    let dockerExecutor: jest.Mocked<DockerodeDockerExecutor>;
    let logStore: jest.Mocked<PersistentLogStoreRepository>;
    let runBus: DeploymentRunBus;
    let diagnostics: jest.Mocked<Pick<DiagnosticLoggerService, 'error'>>;
    let sut: DeploymentRunnerService;

    beforeEach(() => {
        jest.clearAllMocks();

        deploymentsRepository = {} as jest.Mocked<DeploymentsDatabaseRepository>;
        providersRepository = {} as jest.Mocked<GithubAppProvider>;
        dockerExecutor = {} as jest.Mocked<DockerodeDockerExecutor>;
        logStore = {} as jest.Mocked<PersistentLogStoreRepository>;
        runBus = new DeploymentRunBus();
        diagnostics = { error: jest.fn() };

        sut = new DeploymentRunnerService(
            deploymentsRepository,
            providersRepository,
            dockerExecutor,
            logStore,
            runBus,
            diagnostics as unknown as DiagnosticLoggerService,
        );
    });

    it('runs the deployment use case for each request published after init', async () => {
        runDeploymentUseCaseMock.mockResolvedValue(undefined);
        sut.onModuleInit();

        runBus.request(request);
        await flush();

        expect(runDeploymentUseCaseMock).toHaveBeenCalledTimes(1);
        expect(runDeploymentUseCaseMock).toHaveBeenCalledWith(
            deploymentsRepository,
            providersRepository,
            dockerExecutor,
            logStore,
            request,
        );
    });

    it('logs a diagnostic error when the run unexpectedly throws', async () => {
        runDeploymentUseCaseMock.mockRejectedValue(new Error('boom'));
        sut.onModuleInit();

        runBus.request(request);
        await flush();

        expect(diagnostics.error).toHaveBeenCalledTimes(1);
    });

    it('stops handling requests once destroyed', async () => {
        runDeploymentUseCaseMock.mockResolvedValue(undefined);
        sut.onModuleInit();
        sut.onModuleDestroy();

        runBus.request(request);
        await flush();

        expect(runDeploymentUseCaseMock).not.toHaveBeenCalled();
    });
});
