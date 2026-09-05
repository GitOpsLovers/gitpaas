# Roadmap

This document holds the work that GitPaaS has not built yet. One folder holds one future feature, and that folder is the unit of the cycle of the specification-driven development. It carries every artifact of that cycle.

```text
docs/roadmap/<feature>/
    TODO.md        a short introduction, then the phases with their tasks
```

The folder holds that one file, and no other. `/research` reads the code and reports in the conversation; it writes no file. `/plan` writes `TODO.md`: the problem and the answer in six sentences at the most, then one phase for one Pull Request. When the last phase of the feature merges, `documenter` writes the new behavior into `docs/business/`, and the folder of the feature goes away. So this area holds the future alone, and `docs/business.md` holds the present.

## The features

- [custom-network-names](./roadmap/custom-network-names/TODO.md): the name of a Docker network derived from the namespace, the project and the network, with no UUID.
- [complexity-reduction](./roadmap/complexity-reduction/TODO.md): the reduction of the complexity of the code of the three areas.
- [security-hardening](./roadmap/security-hardening/TODO.md): the audit of the security of the three areas, and the phases that close it.
- [database-maintenance](./roadmap/database-maintenance/TODO.md): the button "Debug" that starts a container of pgAdmin with a read-only role, and that stops it.
