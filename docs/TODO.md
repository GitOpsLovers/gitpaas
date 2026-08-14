- [] Add a root `turborepo.json` file. — covered by the OpenSpec change `request-model`, task 1.6.
- [] Decide if we control the secrets with Docker secrets.
- [] Add planner agent.

## Structural

- [] Add a scheduled cleanup job that archives and frees the Redis log streams that an interrupted deployment leaves behind (an archive that fails, or a crash between the last append and the completion). The start-up drain that did this was removed, and nothing recovers these keys now. `@nestjs/schedule` is already in `package.json`.

## The trial run of OpenSpec — unfinished

The adoption of OpenSpec is complete, and its plan is deleted. One thread stays open: the trial change
`server-health-panel` is implemented and its specifications are synced, and it is **not committed**.

- [] Open the Pull Request of `openspec/changes/server-health-panel/`. The working tree holds the panel, its
  31 tests and the synced `openspec/specs/web-server/spec.md`. All 18 tasks are marked.
- [] Run `openspec archive server-health-panel` after that Pull Request merges.
- [] Decide if the mapping of the daemon unwraps `details` like the mapping of the readiness does. Today it
  does not, so a `503` whose envelope carries the information of the daemon under `details` reads as "not
  reachable". The behavior agrees with `design.md`, and it will read as a defect to the next person.
- [] Cover the container `features/server/ui/containers/server-health/`. The requirement *The panel reads one
  time* has no automated guard, because no sibling specification in this repository establishes an
  `HttpTestingController` setup.

## Planned work

The plans that were in `docs/roadmap/` now live as OpenSpec changes. Read the change folder, and not a
document of `docs/`.

| Change | Folder | What it does |
|---|---|---|
| `source-control-providers` | `openspec/changes/source-control-providers/` | Replaces the single GitHub App of the environment with provider records that an operator manages and a service selects |
| `request-model` | `openspec/changes/request-model/` | Moves the HTTP contract into one shared Zod package that the two applications derive from |

Each folder holds `proposal.md` (why and what), `design.md` (the decisions and the risks), `tasks.md` (the
work) and `specs/` (the delta of the specification). Run `rtk openspec show <change>` to read one.

The four documents that these two changes replace — `source-control-providers-plan.md`,
`source-control-providers-plan-todo.md`, `request-model-plan.md` and `request-model-plan-todo.md` — were
deleted from `docs/roadmap/`. Their full text stays in the history of Git, at the commit `287d58f` and
before.

`docs/roadmap/deployment-roadmap.md` stays a roadmap, because it plans no single change.

## How the work is planned now

Every change of the behavior starts with `/opsx:propose`, and it lives in `openspec/changes/`. See the
*Agent workflow* section of [CONTRIBUTING.md](../CONTRIBUTING.md) for the loop, and
[monorepo-architecture.md](./monorepo-architecture.md) for the border between `docs/` and `openspec/`.

The plan that adopted OpenSpec — `docs/roadmap/openspec-adoption-plan-todo.md` — is deleted. Its eight
phases are done, except the three steps of the Git workflow of the trial run, which the list above carries.
Its full text stays in the history of Git.
