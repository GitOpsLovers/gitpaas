# Agents architecture

This document shows the configuration of the AI of GitPaaS: the agents, the skills and the workflow that they follow. `CLAUDE.md`, at the root of the repository, is the entry point for an agent; this area holds the detail that `CLAUDE.md` names but does not carry.

The area does not describe the application. `docs/architecture/monorepo.md`, `docs/architecture/backend.md`, `docs/architecture/frontend.md` and `docs/architecture/infrastructure.md` keep that role.

## Sections

- [Key flows](./agents/key-flows.md): the path of a request from the user to a merge, the choice of the agent, and the border between `docs/business/`, `docs/roadmap/` and `docs/architecture/`.
