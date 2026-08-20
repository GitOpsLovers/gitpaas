export type { EndpointDescriptor, EndpointMap, HttpMethod } from './shared/endpoint.contract';

export { createProjectSchema, projectSchema, updateProjectSchema } from './projects/project.contract';
export type { CreateProjectDto, Project, UpdateProjectDto } from './projects/project.contract';
export { projectParamsSchema, projectsEndpoints, projectsNamespaceParamsSchema } from './projects/projects.endpoints';
