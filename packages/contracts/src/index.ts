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
