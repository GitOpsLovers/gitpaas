---
name: turborepo
description: Turborepo reference - turbo.json, tasks, caching, filters. The pages of docs/architecture/monorepo/ win over it.
metadata:
  version: 2.10.6-canary.5
---

# Turborepo

The reference of the build system, scoped to the behavior that this repository uses. `docs/architecture/monorepo/` holds the pipeline, the stack and the conventions of this repository, and those pages win over this skill.

## The two rules

**Prefer a task of a package over a task of the root.** Add the script to each package's `package.json`, register the task in the root `turbo.json`, and let the root `package.json` only delegate with `turbo run <task>`. `apps/backend`, `apps/frontend` and `packages/contracts` each give the same script names (`build`, `dev`, `lint`, `test`, `check-types`), so one root command runs every one of them, one package at a time and in parallel where the task graph allows it.

```json
// apps/backend/package.json (and every other package)
{ "scripts": { "build": "nest build", "check-types": "tsc -p tsconfig.json --noEmit" } }

// turbo.json - the root registers the task
{ "tasks": { "build": { "dependsOn": ["^build"], "outputs": ["dist/**"] } } }

// package.json of the root - only delegates
{ "scripts": { "build": "turbo run build" } }
```

A script that runs the work itself, such as `"build": "cd apps/backend && nest build"`, defeats this. It forces one sequential command, instead of the parallel run that Turborepo gives for free.

**Write `turbo run`, and not `turbo`, inside a file.** `turbo run <task>` is the form for a script of `package.json`, for a step of `.github/workflows/pr-verify.yml`, and for any other file that a person or a CI system reads back later. The shorthand `turbo <task>` is for a one-off command that a developer types at a terminal, and never for a line that gets committed.

## The keys of a task

`turbo.json` declares nine tasks:

| Task | `dependsOn` | `outputs` | `cache` | `persistent` |
| --- | --- | --- | --- | --- |
| `build` | `^build` | `dist/**` | `true` | `false` |
| `test` | `^build` | `coverage/**` | `true` | `false` |
| `check-types` | `^build` | — | `true` | `false` |
| `lint` | — | — | `true` | `false` |
| `dev` | — | — | `false` | `true` |
| `watch` | — | — | `false` | `true` |
| `start` | — | — | `false` | `true` |
| `start:debug` | — | — | `false` | `true` |
| `start:prod` | `build` | — | `false` | `true` |

`build`, `test` and `check-types` show every key that this repository needs.

| Key | Meaning |
| --- | --- |
| `dependsOn` | Orders the tasks. `^build` runs `build` in every dependency first; `build` (no `^`) runs it in the same package first. `check-types` uses `dependsOn: ["^build"]`, so a package waits for the built output of its own dependencies, and not for its own build. |
| `outputs` | The globs that Turborepo caches. `build` caches `dist/**`; `test` caches `coverage/**`. A task with no `outputs` key caches nothing — `lint` and `check-types` cache no file, only the pass or the fail. |
| `cache` | `true` by default. `dev`, `watch`, `start`, `start:debug` and `start:prod` set it to `false`, because a dev server or a running process is not a reusable artifact. |
| `persistent` | `true` marks a task that never exits. Every long-running task of this repository (`dev`, `watch`, `start`, `start:debug`, `start:prod`) sets it, so a task that depends on one does not wait forever. |
| `inputs` | The files that enter the hash of the task. This repository declares none, so every task falls back to every tracked file of its own package plus `package.json`. |
| `env` | The variables of the environment that enter the hash of one task alone. This repository declares none at the task level; every variable that this repository reads travels through `globalEnv` or `globalPassThroughEnv` instead. |

## The environment

- **`globalEnv`** lists the variables that enter the hash of every task. This repository lists one: `NODE_ENV`. A change of its value invalidates every cached task.
- **`globalPassThroughEnv`** lists the variables that a task may read at run time, without entering the hash. This repository lists the connection strings, the secrets and the throttle settings (`DB_HOST`, `JWT_ACCESS_SECRET`, `THROTTLE_TTL`, and more) here, because a value like a password rotates without changing the code that a cached build already produced.

A variable that belongs in `env` but sits in `globalPassThroughEnv` by mistake will not invalidate the cache when its value changes, and the task then runs the old code against the new value.

## The hash of the cache

The hash of a task combines the global hash (the lockfile, `turbo.json`, and `globalEnv`) with the hash of the task itself (every tracked file of the package, `package.json`, the task's own `dependsOn`, and its own `env`). A cache hit restores `outputs` and replays the logged output, instead of running the command again.

The misses that apply to this repository:

- **A dependency's `build` output changed.** `check-types` and `test` both depend on `^build`, so a change of `packages/contracts` invalidates the `check-types` and the `test` task of `apps/backend` and of `apps/frontend`.
- **A file inside the package changed.** No task declares `inputs`, so any tracked file of the package enters the hash, even one that the task never reads.
- **`turbo.json` changed.** A change of any key, even inside another task's block, invalidates the global hash, and so every task of the repository.

## `--filter`

Select a package by name, or the union of a package and everything that depends on it.

```bash
# One package
turbo run check-types --filter=@gitpaas/backend

# The command of CLAUDE.md — one application, by name
pnpm run check-types --filter @gitpaas/backend

# A package and its dependents — every package that a change of contracts can break
turbo run test --filter=...@gitpaas/contracts
```

`pkg` selects the package alone. `...pkg` adds every package that depends on it — the form to reach for after a change of `packages/contracts`, since `@gitpaas/backend` and `@gitpaas/frontend` both import it. `pkg...` adds every package that it depends on, instead, which matters less here because only `packages/contracts` sits below the two applications.

## The flags of `turbo run`

| Flag | Use |
| --- | --- |
| `--filter` | Narrows the run to one package, or to the dependents of one, as above. |
| `--force` | Skips the cache and re-runs the task, to confirm the task still works and not only its cached result. `turbo run test --filter=@gitpaas/backend --force` re-runs the tests even when nothing changed. |
| `--dry=json` | Prints what would run, and the cache status of each task, without running anything. Useful to check that a filter selects the packages you expect before you run the task for real. |
| `--log-order` | `--log-order=grouped` keeps the log of one task together, instead of interleaved with every other task that runs at the same time; `--log-order=stream` prints each line as it arrives, in whatever order the tasks produce it. |

## The mistakes that break a task here

- **A script in the root `package.json` that does the work itself**, instead of delegating with `turbo run <task>`. It defeats the parallel run of the packages.
- **`turbo <task>` written into a file.** The shorthand belongs to a terminal alone; a file always writes `turbo run <task>`.
- **A long-running task with no `persistent: true`.** Anything that would depend on it, such as a script placed after `start:prod`, waits forever, because Turborepo never sees the task as finished.
- **A secret placed in `env` instead of `globalPassThroughEnv`.** It enters the hash, and a routine credential rotation then triggers a cache miss and a full rebuild for no reason.
- **A new task added to one package's `package.json` alone**, with no matching entry in the root `turbo.json`. `turbo run <task>` then fails to find the task, even though the script itself runs fine with a direct `pnpm run <task>`.
