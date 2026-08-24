# Business

This document states what GitPaaS does for its user. One page holds one capability, and it states the rules of that capability and the cases that prove each rule. The pages describe the behavior that the applications carry today.

The area does not describe how the code works. `docs/architecture/backend.md`, `docs/architecture/frontend.md`, `docs/architecture/monorepo.md` and `docs/architecture/infrastructure.md` keep that role. A rule of the business lives here; the mechanism that carries it lives in the `key-flows.md` of its area.

The future behavior lives in `docs/roadmap.md`. A page of this area moves from the roadmap when the change that builds it merges.

## Sections

- [auth](./business/auth.md): the session, the token, the guard and the role.
- [containers](./business/containers.md): the container of a service, and its state.
- [deployments](./business/deployments.md): the run of a deployment, its queue and its steps.
- [frontend-dashboard](./business/frontend-dashboard.md): the first screen of the application.
- [frontend-shell](./business/frontend-shell.md): the layout, the navigation and the theme.
- [logs](./business/logs.md): the output of a deployment, its stream and its archive.
- [namespaces](./business/namespaces.md): the namespace that holds the projects.
- [networks](./business/networks.md): the network of a stack.
- [projects](./business/projects.md): the project, and the services that it holds.
- [providers](./business/providers.md): the source control provider, and its credentials.
- [server](./business/server.md): the health, the settings and the maintenance of the server.
- [service-environment](./business/service-environment.md): the variable of a service, plain or secret, and its tab "Configuration".
- [services](./business/services.md): the service, its configuration and its detail.
- [users](./business/users.md): the user record, and the password.
