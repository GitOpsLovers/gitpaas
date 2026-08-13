# Backend architecture

This document gives the architecture of the backend application (`apps/backend`). The backend is a REST API made with NestJS.

The application obeys the rules of the **hexagonal/clean architecture**. Thus almost all the business logic is independent of the backend framework. NestJS, TypeORM and the other technologies stay at the edges of the application.

The application also uses **vertical slicing**. Each business domain stays in its own feature (`src/features/`). Thus the code shows the structure of the organization.

## Sections

- [Stack](./backend-architecture/stack.md): tools used for each concern.
- [Structure](./backend-architecture/structure.md): folder structure, architectural layers, feature layout, module wiring and cross-cutting concerns.
- [Conventions](./backend-architecture/conventions.md): programming conventions used in the application.
- [Key flows](./backend-architecture/key-flows.md): explanation of the main flows and why they were designed this way, telemetry and logging included.
- [Operations](./backend-architecture/operations.md): actions that need to be performed on the application.

## Related docs

For the steps to add a feature, use the `backend-feature` skill. For data about the domain workflows, see [backend business](./backend-business.md).

- [Backend business](./backend-business.md)
- [Frontend architecture](./frontend-architecture.md)
- [Infrastructure architecture](./infrastructure-architecture.md)
- [Monorepo architecture](./monorepo-architecture.md)
