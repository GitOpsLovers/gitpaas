# The two rules of Turborepo

## Prefer a task of a package over a task of the root

**Prefer package tasks over Root Tasks.**

When creating tasks/scripts/pipelines, you MUST default to package tasks:

1. Add the script to each relevant package's `package.json`
2. Register the task in root `turbo.json`
3. Root `package.json` only delegates via `turbo run <task>`

**DO NOT** put task logic in root `package.json` when it can live in packages. This defeats Turborepo's parallelization.

```json
// DO THIS
// apps/web/package.json (and every other package)
{ "scripts": { "build": "next build", "lint": "eslint .", "test": "vitest" } }

// turbo.json - register the tasks
{ "tasks": { "build": { "dependsOn": ["^build"], "outputs": ["dist/**"] }, "lint": {} } }

// Root package.json - ONLY delegates, no task logic
{ "scripts": { "build": "turbo run build", "lint": "turbo run lint" } }
```

```json
// DO NOT DO THIS - defeats parallelization
{ "scripts": { "build": "cd apps/web && next build", "lint": "eslint apps/ packages/" } }
```

Root Tasks (`//#taskname`) are ONLY for tasks that truly cannot exist in packages, such as Vitest Projects' `//#test`, repo-wide release scripts, or tooling that does not invoke `turbo` itself.

## Write `turbo run`, and not `turbo`

**Always use `turbo run` when the command is written into code** — `package.json` scripts, CI workflows, shell scripts, and docs.

**The shorthand `turbo <tasks>` is ONLY for one-off terminal commands.** Never write `turbo build` into package.json, CI, or scripts.
