# multi-domain-compose-key

The key `x-gitpaas-domain` of a compose service declares one domain alone, because its schema holds one strict object. A compose service that listens on two ports, such as Minio with the ports 9000 and 9001, needs one host for each port, and the key cannot carry them. This feature lets the key hold a list of declarations too, and it keeps the object for the compose file that already carries one. A duplicated host inside one list fails the deployment at the gate, and an empty list reads as no declaration. The routing, the reconciliation and the tab already work by the host, so they stay as they are. This feature adds no grouping of the rows of the tab, and it changes no record of the origin `user`.

## Phase 1 — The key that holds a list

**Agent:** implementer
**Paths:** `packages/contracts/src/domains/`, `apps/backend/src/features/services/application/`, `apps/backend/src/features/deployments/infrastructure/docker/`

- [x] 1.1 Let the schema of the declaration accept the object of today, or a list of those objects, and export the type of that union.
- [x] 1.2 Let the reader of the key of one compose service return every declaration of that service, and keep the name of the service as the target of each one.
- [x] 1.3 Read an empty list as no declaration, so the service declares no domain and the deployment runs.
- [x] 1.4 Keep the rule between two compose services: two services that claim one host keep the declaration of the first one alone.
- [x] 1.5 Let the gate of the compose file refuse a recipe whose list repeats a host, with the host in the message of the error, and keep its refusal of a declaration that breaks the schema.
- [x] 1.6 Write the unit tests of the parser and of the gate: the object alone, a list of two hosts of one service, an empty list, a duplicated host of one list, and a duplicated host of two services.
- [x] 1.7 Run `rtk pnpm run check-types --filter @gitpaas/backend` and the unit tests of the backend.

## Phase 2 — The documentation

**Agent:** documenter
**This is the last phase.**

- [ ] 2.1 Correct the requirement of the domain that the compose file declares in `docs/business/domains.md`: the key holds one declaration, or a list of them.
- [ ] 2.2 Correct the requirement of the gate of the compose file in `docs/business/deployments.md`, and add the scenario of the duplicated host of one list.
- [ ] 2.3 Delete the folder `docs/roadmap/multi-domain-compose-key/` and its line of `docs/roadmap.md`.
