# Roadmap

This document holds the work that GitPaaS has not built yet. One folder holds one future feature, and that folder is the unit of the cycle of the specification-driven development. It carries every artifact of that cycle.

```text
docs/roadmap/<feature>/
    TODO.md        what the feature must do, and why it matters
    research.md    the result of the phase of the research
    plan.md        the decisions, the rules that the feature adds, and the phases with their tasks
```

A folder starts with `TODO.md` alone. The orchestrator writes `research.md` and then `plan.md` during the cycle, and the user approves each one. When the last phase of the feature merges, `documenter` writes the new behavior into `docs/business/`, and the folder of the feature goes away. So this area holds the future alone, and `docs/business.md` holds the present.

## The features

- [service-environment](./roadmap/service-environment/TODO.md): the variables and the secrets of a service.
- [domains](./roadmap/domains/TODO.md): the public address of a service, and its certificate.
- [complexity-reduction](./roadmap/complexity-reduction/TODO.md): the reduction of the complexity of the code of the three areas.
- [security-hardening](./roadmap/security-hardening/TODO.md): the audit of the security of the three areas, and the phases that close it.
- [agent-efficiency](./roadmap/agent-efficiency/TODO.md): the reduction of the tokens of the layer of the AI, and the workflow of the user.
