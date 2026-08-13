# Frontend architecture

This document gives the architecture of the frontend application (`apps/frontend`), an Angular SPA with Tailwind CSS styles.

The application uses **feature folders** with layers: `domain` (the types), `infrastructure` (the data access and the browser persistence) and `ui` (the components plus the guards, the interceptors and the services of the feature). Around these features there is a shared application shell (`layout`), the route-level `pages`, and the `shared` code for all the features. A client-side JWT authentication with refresh-token rotation controls the access: there is one public sign-in route and one protected application shell.


## Sections

- [Stack](./frontend-architecture/stack.md): tools used for each concern.
- [Structure](./frontend-architecture/structure.md): bootstrap and routing, per-feature layout, layout and pages, and shared code.
- [Conventions](./frontend-architecture/conventions.md): programming conventions used in the application.
- [Key flows](./frontend-architecture/key-flows.md): explanation of the main flows and why they were designed this way.
- [Operations](./frontend-architecture/operations.md): actions that need to be performed on the application.

## Related docs

- [Backend architecture](./backend-architecture.md)
- [Infrastructure architecture](./infrastructure-architecture.md)
- [Monorepo architecture](./monorepo-architecture.md)
