# Backend business logic

This document gives the primary domain workflows of `apps/backend` in simple words. For the architecture behind these patterns, see [backend-architecture.md](./backend-architecture.md).

## Sections

- [Domain model](./backend-business/domain-model.md): namespaces, projects, services, deployments and users.
- [Access & authentication](./backend-business/access-authentication.md): the private-by-default API, login, token refresh with rotation, and logout.
- [Deployment workflow](./backend-business/deployment-workflow.md): trigger, validation, background run, logs and reading the output.
- [Deletion & cleanup](./backend-business/deletion-cleanup.md): what happens when a deployment or a service is deleted.
- [Server maintenance](./backend-business/server-maintenance.md): resource cleanup and the readiness probe.
