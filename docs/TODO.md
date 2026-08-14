- [] Add a root `turborepo.json` file. — covered by the OpenSpec change `request-model`, task 1.6.
- [] Decide if we control the secrets with Docker secrets.
- [] Add planner agent.

## Structural

- [] Add a scheduled cleanup job that archives and frees the Redis log streams that an interrupted deployment leaves behind (an archive that fails, or a crash between the last append and the completion). The start-up drain that did this was removed, and nothing recovers these keys now. `@nestjs/schedule` is already in `package.json`.

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
