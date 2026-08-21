export type { EndpointDescriptor, EndpointMap, HttpMethod } from './shared/endpoint.contract';

export { createProjectSchema, projectSchema, updateProjectSchema } from './projects/project.contract';
export type { CreateProjectDto, Project, UpdateProjectDto } from './projects/project.contract';
export { projectParamsSchema, projectsEndpoints, projectsNamespaceParamsSchema } from './projects/projects.endpoints';

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
