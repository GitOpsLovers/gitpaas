# Backend architecture

This document gives the architecture of the backend application (`apps/backend`). The backend is a REST API made with NestJS.

The application obeys the rules of the **hexagonal/clean architecture**. Thus almost all the business logic is independent of the backend framework. NestJS, TypeORM and the other technologies stay at the edges of the application.

The application also uses **vertical slicing**. Each business domain stays in its own feature (`src/features/`). Thus the code shows the structure of the organization.

## Sections

- [Stack](./backend/stack.md): tools used for each concern.
- [Structure](./backend/structure.md): folder structure, architectural layers, feature layout, module wiring and cross-cutting concerns.
- [Conventions](./backend/conventions.md): programming conventions used in the application.
- [Key flows](./backend/key-flows.md): one section for each flow of the request, the background work and the business, and the reason of its design. Telemetry and logging included.
- [Operations](./backend/operations.md): actions that need to be performed on the application.
