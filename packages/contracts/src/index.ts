export type { EndpointDescriptor, EndpointMap, HttpMethod } from './shared/endpoint.contract';
export { errorEnvelopeSchema } from './shared/error-envelope.contract';
export type { ErrorEnvelope } from './shared/error-envelope.contract';

export { createProjectSchema, projectSchema, updateProjectSchema } from './projects/project.contract';
export type { CreateProjectDto, Project, UpdateProjectDto } from './projects/project.contract';
export { projectParamsSchema, projectsEndpoints, projectsNamespaceParamsSchema } from './projects/projects.endpoints';

export { createNamespaceSchema, namespaceSchema, updateNamespaceSchema } from './namespaces/namespace.contract';
export type { CreateNamespaceDto, Namespace, UpdateNamespaceDto } from './namespaces/namespace.contract';
export { namespaceParamsSchema, namespacesEndpoints } from './namespaces/namespaces.endpoints';

export { createServiceSchema, serviceSchema, updateServiceSchema } from './services/service.contract';
export type { CreateServiceDto, Service, UpdateServiceDto } from './services/service.contract';
export { serviceParamsSchema, servicesEndpoints, servicesQuerySchema } from './services/services.endpoints';

export { deploymentSchema, deploymentStatusSchema, triggerDeploymentSchema } from './deployments/deployment.contract';
export type { Deployment, DeploymentStatus, TriggerDeploymentDto } from './deployments/deployment.contract';
export { deploymentParamsSchema, deploymentsEndpoints, deploymentsQuerySchema } from './deployments/deployments.endpoints';

export { authTokensSchema, loginSchema, refreshSchema } from './authentication/authentication.contract';
export type { AuthTokens, LoginDto, RefreshDto } from './authentication/authentication.contract';
export { userRoleSchema, userSchema } from './authentication/user.contract';
export type { User, UserRole } from './authentication/user.contract';
export { authenticationEndpoints } from './authentication/authentication.endpoints';

export {
    createProviderSchema,
    providerConnectionOutcomeSchema,
    providerConnectionTestSchema,
    providerSchema,
    providerTypeSchema,
    updateProviderSchema,
} from './providers/provider.contract';
export type {
    CreateProviderDto,
    Provider,
    ProviderConnectionOutcome,
    ProviderConnectionTest,
    ProviderType,
    UpdateProviderDto,
} from './providers/provider.contract';
export {
    completeProviderRegistrationSchema,
    convertedProviderRegistrationSchema,
    convertProviderRegistrationSchema,
    providerAppManifestSchema,
    providerAppOwnerTypeSchema,
    providerRegistrationSchema,
    providerRegistrationStepSchema,
    startedProviderRegistrationSchema,
    startProviderRegistrationSchema,
} from './providers/provider-registration.contract';
export type {
    CompleteProviderRegistrationDto,
    ConvertedProviderRegistration,
    ConvertProviderRegistrationDto,
    ProviderAppManifest,
    ProviderAppOwnerType,
    ProviderRegistration,
    ProviderRegistrationStep,
    StartedProviderRegistration,
    StartProviderRegistrationDto,
} from './providers/provider-registration.contract';
export { gitBranchSchema, gitRepositorySchema } from './providers/git.contract';
export type { GitBranch, GitRepository } from './providers/git.contract';
export {
    providerParamsSchema,
    providerRegistrationParamsSchema,
    providerRepositoryParamsSchema,
    providersEndpoints,
} from './providers/providers.endpoints';

export {
    dependencyStateSchema,
    dependencyStatusSchema,
    readinessResultSchema,
    readinessStateSchema,
} from './server/readiness.contract';
export type {
    DependencyState,
    DependencyStatus,
    ReadinessResult,
    ReadinessState,
} from './server/readiness.contract';
export { serverStatusSchema } from './server/server-status.contract';
export type { ServerStatus } from './server/server-status.contract';
export { orphanRemovalResultSchema, pruneResultSchema } from './server/maintenance.contract';
export type { OrphanRemovalResult, PruneResult } from './server/maintenance.contract';
export { serverEndpoints } from './server/server.endpoints';

export { containerPortSchema, containerSchema } from './containers/container.contract';
export type { Container, ContainerPort } from './containers/container.contract';
export { containersEndpoints, containersQuerySchema } from './containers/containers.endpoints';

export { networkSchema } from './networks/network.contract';
export type { Network } from './networks/network.contract';
export { networksEndpoints, networksQuerySchema } from './networks/networks.endpoints';

export {
    logEndEventSchema,
    logErrorEventSchema,
    logEventSchema,
    logLineEventSchema,
    logStatusSchema,
    storedLogEventSchema,
} from './logs/log-event.contract';
export type {
    LogEndEvent,
    LogErrorEvent,
    LogEvent,
    LogLineEvent,
    LogStatus,
    StoredLogEvent,
} from './logs/log-event.contract';
