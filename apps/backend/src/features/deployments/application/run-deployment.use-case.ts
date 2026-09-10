import { ServiceNotDeployableError } from '../domain/errors/deployment.errors';
import { DeploymentRunTask } from '../domain/models/deployment-run-task.models';
import { DeploymentTarget, DockerExecutor } from '../domain/ports/docker-executor.port';
import { DeploymentsRepository } from '../domain/repositories/deployments.repository';

import { maskSecretValuesUseCase } from './mask-secret-values.use-case';

import { DomainError } from '@core/domain/errors/domain.error';
import type { AppLogger } from '@core/domain/ports/app-logger.port';
import type { SecretCipher } from '@core/domain/ports/secret-cipher.port';
import { reconcileComposeDomainsUseCase } from '@features/domains/application/reconcile-compose-domains.use-case';
import { ReverseProxy } from '@features/domains/domain/ports/reverse-proxy.port';
import { DomainsRepository } from '@features/domains/domain/repositories/domains.repository';
import { LogStore } from '@features/logs/domain/ports/log-store.port';
import { getProviderCredentialsUseCase } from '@features/providers/application/get-provider-credentials.use-case';
import { ProviderCredentials } from '@features/providers/domain/models/provider.models';
import { ProviderClient } from '@features/providers/domain/ports/provider-client.port';
import { ProvidersRepository } from '@features/providers/domain/repositories/providers.repository';
import { getServiceEnvironmentUseCase } from '@features/service-environment/application/get-service-environment.use-case';
import { ServiceVariablesRepository } from '@features/service-environment/domain/repositories/service-variables.repository';
import { parseComposeDomainsUseCase } from '@features/services/application/parse-compose-domains.use-case';
import { ServiceNotFoundError } from '@features/services/domain/errors/service.errors';
import { Service } from '@features/services/domain/models/service.models';
import { RepositoryComposeFile } from '@features/services/domain/ports/repository-compose-file.port';
import { ServicesRepository } from '@features/services/domain/repositories/services.repository';
import { parseComposeVolumesUseCase } from '@features/volumes/application/parse-compose-volumes.use-case';
import { reconcileComposeVolumesUseCase } from '@features/volumes/application/reconcile-compose-volumes.use-case';
import { ServiceVolumesRepository } from '@features/volumes/domain/repositories/service-volumes.repository';
import { VolumesRepository } from '@features/volumes/domain/repositories/volumes.repository';

/**
 * Reads the clear value of every variable of a secret of a service, which no line of the log may carry.
 *
 * @param serviceVariablesRepository Service variables repository
 * @param serviceId Service the variables belong to
 * @param environment Variables of the service, by name, with their clear value
 *
 * @returns The clear value of every variable the service marks as a secret
 */
async function loadSecretValues(
    serviceVariablesRepository: ServiceVariablesRepository,
    serviceId: string,
    environment: Record<string, string>,
): Promise<string[]> {
    const stored = await serviceVariablesRepository.getStoredByService(serviceId);
    const secrets = new Set(stored.filter((variable) => variable.secret).map((variable) => variable.name));

    return Object.entries(environment)
        .filter(([name]) => secrets.has(name))
        .map(([, value]) => value);
}

/**
 * Loads the service of a deployment, and the credentials its provider gives to the provider client.
 *
 * @param deploymentsRepository Deployments repository
 * @param servicesRepository Services repository
 * @param providersRepository Providers repository
 * @param deploymentId Deployment being run
 *
 * @returns The service of the deployment, and the credentials of its provider
 *
 * @throws ServiceNotFoundError When the deployment or its service no longer exists
 * @throws ServiceNotDeployableError When the service names no provider
 * @throws ProviderNotFoundError When the provider of the service no longer exists
 */
async function loadServiceContext(
    deploymentsRepository: DeploymentsRepository,
    servicesRepository: ServicesRepository,
    providersRepository: ProvidersRepository,
    deploymentId: string,
): Promise<{ service: Service; credentials: ProviderCredentials }> {
    const deployment = await deploymentsRepository.findById(deploymentId);
    const service = deployment ? await servicesRepository.findById(deployment.serviceId) : null;

    if (!service) {
        throw new ServiceNotFoundError(deployment?.serviceId ?? deploymentId);
    }

    if (!service.providerId) {
        throw new ServiceNotDeployableError();
    }

    const credentials = await getProviderCredentialsUseCase(providersRepository, service.providerId);

    return { service, credentials };
}

/**
 * Reads the compose file of the deployment out of the archive the run already holds, which the caches of the run share.
 *
 * @param repositoryComposeFile Reader of the Compose file of a repository
 * @param archive Gzipped tarball of the repository of the deployment
 * @param composerPath Path of the Compose file inside the repository
 * @param emit Sink of one line of the log of the deployment
 *
 * @returns The text of the compose file, or `null` when the archive carries none and when the read fails
 */
function readComposeText(
    repositoryComposeFile: RepositoryComposeFile,
    archive: Buffer,
    composerPath: string,
    emit: (line: string) => void,
): Promise<string | null> {
    return repositoryComposeFile.read(archive, composerPath).catch(() => {
        emit('▹ The Compose file could not be read.');

        return null;
    });
}

/**
 * Writes the cache of the domains the compose file of the deployment declares.
 *
 * @param servicesRepository Services repository, which holds the cache of the compose file
 * @param text Text of the compose file of the deployment, or `null` when the run read none
 * @param serviceId Service the compose file belongs to
 *
 * @throws {Error} When the text of the compose file is no valid YAML
 */
async function cacheComposeDomains(
    servicesRepository: ServicesRepository,
    text: string | null,
    serviceId: string,
): Promise<void> {
    if (text === null) {
        return;
    }

    await servicesRepository.saveComposeDomains(serviceId, {
        domains: parseComposeDomainsUseCase(text),
        refreshedAt: new Date(),
    });
}

/**
 * Brings the volumes of a service to the named volumes its compose file declares.
 *
 * @param volumesRepository Volumes repository
 * @param serviceVolumesRepository Service volumes repository, which caches the mount of the compose file
 * @param text Text of the compose file of the deployment, or `null` when the run read none
 * @param serviceId Service the compose file belongs to
 *
 * @throws {Error} When the text of the compose file is no valid YAML
 */
async function reconcileComposeVolumes(
    volumesRepository: VolumesRepository,
    serviceVolumesRepository: ServiceVolumesRepository,
    text: string | null,
    serviceId: string,
): Promise<void> {
    if (text === null) {
        return;
    }

    await reconcileComposeVolumesUseCase(
        volumesRepository,
        serviceVolumesRepository,
        serviceId,
        parseComposeVolumesUseCase(text),
    );
}

/**
 * Reason a failed deployment stores and answers with, when the failure is none of the domain.
 */
export const DEPLOYMENT_FAILURE_REASON = 'The deployment failed. The server holds the detail of the failure.';

/**
 * Context the detail of a failed deployment carries in the log of the server.
 */
export const RUN_DEPLOYMENT_LOG_CONTEXT = 'runDeploymentUseCase';

/**
 * Use case that runs a deployment.
 *
 * @param deploymentsRepository Deployments repository
 * @param servicesRepository Services repository
 * @param providersRepository Providers repository
 * @param serviceVariablesRepository Service variables repository
 * @param domainsRepository Domains repository
 * @param volumesRepository Volumes repository, which holds the volumes the compose file of the service declares
 * @param serviceVolumesRepository Service volumes repository, which caches the mount the compose file declares
 * @param providerClient Provider client port
 * @param repositoryComposeFile Reader of the Compose file of a repository, which the cache of the declared domains reads
 * @param dockerExecutor Docker executor
 * @param reverseProxy Reverse proxy, which builds the labels of the routing of the service
 * @param logStore Logs store
 * @param secretCipher Secret cipher, which opens the secrets of the service
 * @param logger Application logger, which alone receives the detail of a failure
 * @param payload Run payload
 */
export async function runDeploymentUseCase(
    deploymentsRepository: DeploymentsRepository,
    servicesRepository: ServicesRepository,
    providersRepository: ProvidersRepository,
    serviceVariablesRepository: ServiceVariablesRepository,
    domainsRepository: DomainsRepository,
    volumesRepository: VolumesRepository,
    serviceVolumesRepository: ServiceVolumesRepository,
    providerClient: ProviderClient,
    repositoryComposeFile: RepositoryComposeFile,
    dockerExecutor: DockerExecutor,
    reverseProxy: ReverseProxy,
    logStore: LogStore,
    secretCipher: SecretCipher,
    logger: AppLogger,
    payload: DeploymentRunTask,
): Promise<void> {
    await deploymentsRepository.update(payload.deploymentId, { status: 'running' });

    try {
        const { service, credentials } = await loadServiceContext(
            deploymentsRepository,
            servicesRepository,
            providersRepository,
            payload.deploymentId,
        );

        const archive = await providerClient.getRepositoryArchive(credentials, payload.repositoryId, payload.commit);
        const environment = await getServiceEnvironmentUseCase(serviceVariablesRepository, secretCipher, service.id);
        const secrets = await loadSecretValues(serviceVariablesRepository, service.id, environment);

        // The output of the build, of the pull and of a container reaches the log of the deployment,
        // so no value of a secret of the service survives in the line the store keeps.
        const emit = (line: string): void => {
            logStore.append(payload.deploymentId, maskSecretValuesUseCase(line, secrets)).catch(() => undefined);
        };

        // The cache of the declared domains carries the compose file of this commit, and the
        // reconciliation reads it alone, so a recipe of no valid YAML keeps the last cache and
        // never fails a deployment the executor would otherwise bring up. The reconciliation of
        // the volumes reads the same text, so the run opens the archive one time alone.
        const composeText = await readComposeText(repositoryComposeFile, archive, payload.composerPath, emit);

        await cacheComposeDomains(servicesRepository, composeText, service.id)
            .catch(() => { emit('▹ The domains of the Compose file could not be read.'); });

        // The compose file of the service declares a domain too, and its record reaches the
        // routing of this deployment alone when the reconciliation runs before the build.
        await reconcileComposeDomainsUseCase(domainsRepository, servicesRepository, service.id);

        const domains = await domainsRepository.getByService(service.id);
        const routing = reverseProxy.buildRouting(domains);
        const target: DeploymentTarget = { serviceId: service.id, projectName: service.composeProject };

        const deployed = await dockerExecutor.up(archive, payload.composerPath, target, environment, routing, emit);

        // The executor masks the block `environment` of the final Compose text, and the interpolation
        // writes a variable anywhere else too - a command, a label, an argument of the build - so the
        // value of a secret that survived that mask never reaches the text the store keeps.
        const finalCompose = maskSecretValuesUseCase(deployed, secrets);

        // The compose file is the one source of truth of the volumes of the service, and no record of
        // a volume ever fails a deployment the daemon already brought up.
        await reconcileComposeVolumes(volumesRepository, serviceVolumesRepository, composeText, service.id)
            .catch(() => { emit('▹ The volumes of the Compose file could not be reconciled.'); });

        await deploymentsRepository.update(payload.deploymentId, { status: 'success', finalCompose });
        await logStore.complete(payload.deploymentId, 'success');
    } catch (error) {
        // A failure of the executor carries the path of the host, the output of the daemon and the
        // value of a variable, so the server alone reads the detail, and the user reads the reason.
        const reason = error instanceof DomainError ? error.message : DEPLOYMENT_FAILURE_REASON;
        const detail = error instanceof Error ? error.message : String(error);

        logger.error(
            `Deployment ${payload.deploymentId} failed: ${detail}`,
            error,
            RUN_DEPLOYMENT_LOG_CONTEXT,
        );

        await deploymentsRepository.update(payload.deploymentId, { status: 'failed', error: reason });
        await logStore.append(payload.deploymentId, `✖ Deployment failed: ${reason}`);
        await logStore.complete(payload.deploymentId, 'failed');
    }
}
