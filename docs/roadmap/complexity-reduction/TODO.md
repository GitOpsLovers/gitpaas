# Complexity reduction

## What this feature must do

Reduce the complexity of the code of GitPaaS, and keep every rule of the business exactly as it is
today. The work covers the three areas of the system: the backend, the frontend and the
infrastructure.

The result is a plan of refactors. Each refactor keeps the behavior, so no page of `docs/business/`
becomes false, and no page needs a new rule.

## Why it matters

The system holds 12 features in the backend and 9 features in the frontend. Some of them grew large:
`providers` holds 2677 lines and `deployments` holds 2124 lines in the backend, and `services` holds
1579 lines and `providers` holds 1417 lines in the frontend. A large feature costs more to read, to
change and to test, and it slows every task that touches it.

## What the analysis must cover

- **The backend.** The four layers of each feature, the wiring of the modules, the duplication
  between the features, the size of the controllers and of the services, the transformers, the
  errors, and the shape of `core/` and of `shared/`.
- **The frontend.** The three layers of each feature, the containers and the presentational
  components, the state of the signals, the repositories of the API, the duplication between the
  features, and the shape of `shared/`.
- **The infrastructure.** The workspace of Turborepo, the pipeline of the tasks, the package
  `@gitpaas/contracts`, the files of `iac/`, the workflows of GitHub, and the scripts.

## The limits

- **No change of the behavior.** A refactor that changes one rule of the business leaves this
  feature, and it takes its own folder of the roadmap.
- **No over-engineering.** An abstraction enters the plan only when it removes duplication that
  exists today. A pattern for a future need does not enter.
- **The rules of the architecture hold.** The plan respects `.claude/rules/agent-rules.md`: the
  dependencies point inward, a use case is a pure function, and an adapter is the only provider.
- **No new dependency**, unless the plan names it and the user approves it.

## The open questions

- How much of the duplication is accidental, and how much is a real difference between the features?
- Which large file is large because the domain is large, and which one is large because it holds two
  jobs?
