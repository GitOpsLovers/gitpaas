# Architecture

This document shows how GitPaaS is built. One folder holds one area, and each area carries its own index page with the same name. The five areas answer one question each: which tool serves each concern, how the folders are laid out, which rule a developer follows, how a request travels through the layers, and which action an operator runs.

The area does not state what the system does for its user. `docs/business.md` keeps that role, and `docs/roadmap.md` holds the behavior that nobody built yet. A page of this area that needs a rule of the business links it; it never restates it.

## Sections

- [Monorepo](./architecture/monorepo.md): the repository, the packages and the pipeline of Turborepo.
- [Backend](./architecture/backend.md): the NestJS application, its four layers and its flows.
- [Frontend](./architecture/frontend.md): the Angular application, its three layers and its flows.
- [Infrastructure](./architecture/infrastructure.md): the compose stacks, the installer and the server.
- [Agents](./architecture/agents.md): the configuration of the AI, and the workflow that the agents follow.
