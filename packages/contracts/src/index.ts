export { errorEnvelopeSchema } from './shared/error-envelope.contract';
export type { ErrorEnvelope } from './shared/error-envelope.contract';

export { createProjectSchema, projectSchema, updateProjectSchema } from './projects/project.contract';
export type { CreateProjectDto, Project, UpdateProjectDto } from './projects/project.contract';

export { createNamespaceSchema, namespaceSchema, updateNamespaceSchema } from './namespaces/namespace.contract';
export type { CreateNamespaceDto, Namespace, UpdateNamespaceDto } from './namespaces/namespace.contract';

export { createServiceSchema, serviceSchema, updateServiceSchema } from './services/service.contract';
export type { CreateServiceDto, Service, UpdateServiceDto } from './services/service.contract';

export {
    SERVICE_VARIABLE_NAME_MAX_LENGTH,
    SERVICE_VARIABLE_NAME_MESSAGE,
    SERVICE_VARIABLE_NAME_PATTERN,
    serviceVariableSchema,
    setServiceVariableSchema,
    updateServiceVariableSchema,
} from './service-environment/service-variable.contract';
export type {
    ServiceVariable,
    SetServiceVariableDto,
    UpdateServiceVariableDto,
} from './service-environment/service-variable.contract';

export {
    certificateStateSchema,
    claimDomainSchema,
    DOMAIN_HOST_MAX_LENGTH,
    DOMAIN_HOST_MESSAGE,
    DOMAIN_HOST_PATTERN,
    DOMAIN_PORT_MAX,
    DOMAIN_PORT_MIN,
    domainSchema,
    updateDomainSchema,
} from './domains/domain.contract';
export type { CertificateState, ClaimDomainDto, Domain, UpdateDomainDto } from './domains/domain.contract';

export { deploymentSchema, deploymentStatusSchema, triggerDeploymentSchema } from './deployments/deployment.contract';
export type { Deployment, DeploymentStatus, TriggerDeploymentDto } from './deployments/deployment.contract';

export { authTokensSchema, loginSchema, refreshSchema } from './authentication/authentication.contract';
export type { AuthTokens, LoginDto, RefreshDto } from './authentication/authentication.contract';
export { userRoleSchema, userSchema } from './authentication/user.contract';
export type { User, UserRole } from './authentication/user.contract';

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
export {
    LOG_RETENTION_MAX_DAYS,
    LOG_RETENTION_MIN_DAYS,
    platformSettingsSchema,
    updatePlatformSettingsSchema,
} from './server/platform-settings.contract';
export type { PlatformSettings, UpdatePlatformSettingsDto } from './server/platform-settings.contract';
export {
    platformUpdateSchema,
    platformUpdateStateSchema,
    platformUpdateStatusSchema,
} from './server/platform-update.contract';
export type { PlatformUpdate, PlatformUpdateState, PlatformUpdateStatus } from './server/platform-update.contract';

export { containerPortSchema, containerSchema } from './containers/container.contract';
export type { Container, ContainerPort } from './containers/container.contract';

export { networkSchema, networkStateSchema } from './networks/network.contract';
export type { Network, NetworkState } from './networks/network.contract';

export {
    createProjectNetworkSchema,
    joinProjectNetworkSchema,
    PROJECT_NETWORK_NAME_MAX_LENGTH,
    PROJECT_NETWORK_NAME_MESSAGE,
    PROJECT_NETWORK_NAME_PATTERN,
    projectNetworkName,
    projectNetworkSchema,
    projectNetworkStateSchema,
    updateProjectNetworkSchema,
} from './networks/project-network.contract';
export type {
    CreateProjectNetworkDto,
    JoinProjectNetworkDto,
    ProjectNetwork,
    ProjectNetworkState,
    UpdateProjectNetworkDto,
} from './networks/project-network.contract';

export {
    archivedLogEntrySchema,
    deploymentLogArchiveSchema,
    logArchiveStateSchema,
} from './logs/log-archive.contract';
export type { ArchivedLogEntry, DeploymentLogArchive, LogArchiveState } from './logs/log-archive.contract';
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
