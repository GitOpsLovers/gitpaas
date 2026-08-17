# Infrastructure architecture

This document gives the infrastructure on which the GitPaaS application runs. Two responsibilities stay together on that server:

- **Control plane**: GitPaaS itself, that is, the backend and frontend applications, plus a PostgreSQL database that holds all the durable data, and a Redis server that holds the output of the deployments that run.
- **Workloads**: the applications that the user deploys, which run as compose stacks on the Docker daemon of the same server.

## Sections

- [Stack](./infrastructure-architecture/stack.md): tools used for each concern.
- [Structure](./infrastructure-architecture/structure.md): the layout of the development and production compose stacks and where each part lives.
- [Conventions](./infrastructure-architecture/conventions.md): programming conventions used in the application.
- [Installation](./infrastructure-architecture/installation.md): the one-line installer, its options, steps and admin seeding.
- [Key flows](./infrastructure-architecture/key-flows.md): explanation of the main flows, including the live log store, and why they were designed this way.
- [Operations](./infrastructure-architecture/operations.md): day-to-day tasks and what is not covered yet.