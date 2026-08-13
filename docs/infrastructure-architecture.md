# Infrastructure architecture

This document gives the infrastructure on which the GitPaaS application runs.

GitPaaS runs **fully on one server**. Two responsibilities stay together on that server:

- **Control plane**: GitPaaS itself, that is, the backend application and the frontend application, plus a PostgreSQL database that holds all the durable data, and a Redis server that holds the output of the deployments that run. The log of a run lives in Redis while the run lasts, and goes to PostgreSQL as the archive when it ends.
- **Workloads**: the applications that the user deploys, which run as compose stacks on the Docker daemon of the same server.

The backend controls the **local** Docker daemon through the `/var/run/docker.sock` unix socket. In production, this socket is bind-mounted into the backend container. In development, the backend uses the socket of the developer.


## Sections

- [Stack](./infrastructure-architecture/stack.md): tools used for each concern.
- [Structure](./infrastructure-architecture/structure.md): development and production compose stacks, images and the live log store.
- [Conventions](./infrastructure-architecture/conventions.md): programming conventions used in the application.
- [Installation](./infrastructure-architecture/installation.md): the one-line installer, its options, steps and admin seeding.
- [Key flows](./infrastructure-architecture/key-flows.md): explanation of the main flows and why they were designed this way.
- [Operations](./infrastructure-architecture/operations.md): day-to-day tasks and what is not covered yet.

## Related docs

- [Deployment roadmap](./deployment-roadmap.md)
- [Backend architecture](./backend-architecture.md)
- [Frontend architecture](./frontend-architecture.md)
- [Monorepo architecture](./monorepo-architecture.md)
