---
name: turborepo
description: |
  Turborepo monorepo build system guidance. Triggers on: turbo.json, task pipelines,
  dependsOn, caching, remote cache, the "turbo" CLI, --filter, --affected, CI optimization, environment
  variables, internal packages, monorepo structure/best practices, and boundaries.

  Use when user: configures tasks/workflows/pipelines, creates packages, sets up
  monorepo, shares code between apps, runs changed/affected packages, debugs cache,
  or has apps/packages directories.
metadata:
  version: 2.10.6-canary.5
---

# Turborepo Skill

Build system for JavaScript/TypeScript monorepos. Turborepo caches task outputs and runs tasks in parallel.

## IMPORTANT: Package Tasks, Not Root Tasks

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

## Secondary Rule: `turbo run` vs `turbo`

**Always use `turbo run` when the command is written into code** — `package.json` scripts, CI workflows, shell scripts, and docs.

**The shorthand `turbo <tasks>` is ONLY for one-off terminal commands.** Never write `turbo build` into package.json, CI, or scripts.

## Quick Decision Trees

Paths are relative to `./references/`. Read the target file for the answer.

```
Configure a task?
├─ Task keys, transit nodes → configuration/tasks.md
├─ Ready-made pipeline → configuration/recipes.md
├─ Per-package config → configuration/RULE.md#package-configurations
├─ Mistake to avoid → configuration/gotchas.md
└─ Global settings → configuration/global-options.md

Cache problems?
├─ Hash inputs → caching/RULE.md
├─ Misses or wrong hits → caching/gotchas.md
├─ Remote cache → caching/remote-cache.md
└─ Env causes misses → environment/gotchas.md

Run only what changed?
├─ Use --affected (RECOMMENDED, includes dependents)
└─ Custom base or git range → filtering/RULE.md

Filter packages?
├─ Syntax → filtering/RULE.md
└─ Combinations → filtering/patterns.md

Environment issues?
├─ Keys → environment/RULE.md
├─ Modes, inference → environment/modes.md
└─ .env and CI vars → environment/gotchas.md

CI setup?
├─ Principles → ci/RULE.md
├─ GitHub Actions → ci/github-actions.md
├─ Vercel, turbo-ignore → ci/vercel.md
├─ --affected strategies → ci/patterns.md
└─ Flags → cli/commands.md

Watch mode?
├─ turbo watch → watch/RULE.md
├─ with, interruptible → configuration/tasks.md
└─ One-shot dev scripts → configuration/recipes.md

Create or structure a package?
├─ Internal packages → best-practices/packages.md
├─ Repo layout, tsconfig → best-practices/structure.md
├─ Dependencies → best-practices/dependencies.md
└─ Types, anti-patterns → best-practices/RULE.md

Enforce boundaries?
├─ Run turbo boundaries
└─ Tags, rule types → boundaries/RULE.md
```

## Reference Index

- `references/configuration/` — `RULE.md` turbo.json overview, Package Configurations; `tasks.md` task keys; `global-options.md` global keys, futureFlags; `recipes.md` task configurations; `gotchas.md` mistakes
- `references/caching/` — `RULE.md` how caching works; `remote-cache.md` Vercel and self-hosted; `gotchas.md` cache misses
- `references/environment/` — `RULE.md` env keys; `modes.md` strict vs loose; `gotchas.md` .env files, CI issues
- `references/filtering/` — `RULE.md` --affected, --filter; `patterns.md` filter patterns
- `references/ci/` — `RULE.md` principles; `github-actions.md`; `vercel.md` turbo-ignore; `patterns.md` strategies
- `references/cli/` — `RULE.md` turbo run basics; `commands.md` flags, other commands
- `references/best-practices/` — `RULE.md` anti-patterns; `structure.md` repo layout; `packages.md` internal packages; `dependencies.md` deps
- `references/watch/RULE.md` — turbo watch, interruptible tasks
- `references/boundaries/RULE.md` — package isolation, tag rules
