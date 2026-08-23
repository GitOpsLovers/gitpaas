# Agents architecture

This document shows the configuration of the AI of GitPaaS: the agents, the skills, the commands and the metrics that track their cost. `CLAUDE.md`, at the root of the repository, is the entry point for an agent; this area holds the detail that `CLAUDE.md` names but does not carry.

The area does not describe the application. `docs/monorepo-architecture.md`, `docs/backend-architecture.md`, `docs/frontend-architecture.md` and `docs/infrastructure-architecture.md` keep that role.

## Sections

- [Operations](./agents-architecture/operations.md): the metrics of the configuration of the agents, and the changelog that tracks a change of that configuration.
- [Key flows](./agents-architecture/key-flows.md): the path of a request from the user to a merge, the choice of the agent, and the border between the `opsx` commands and the six subagents.
