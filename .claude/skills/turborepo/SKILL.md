---
name: turborepo
description: Turborepo reference - turbo.json, tasks, caching, filters. The pages of docs/architecture/monorepo/ win over it.
metadata:
  version: 2.10.6-canary.5
---

# Turborepo

The general documentation of the build system. `docs/architecture/monorepo/` holds the pipeline, the packages and the conventions of this repository, and those pages win over this skill. Read this skill for a behavior of `turbo` that no page of the project covers.

## The reference files

| The file | Read it when |
| --- | --- |
| [rules.md](references/rules.md) | You add a task or a script. It holds the two rules that break the most often. |
| [decision-trees.md](references/decision-trees.md) | You know the question, and you need the file that answers it. |
| [configuration/RULE.md](references/configuration/RULE.md) | You need the shape of `turbo.json`, or a configuration of one package. |
| [configuration/tasks.md](references/configuration/tasks.md) | You declare a task, its keys, or a node of transit. |
| [configuration/global-options.md](references/configuration/global-options.md) | You need a global key, or a flag of the future. |
| [configuration/recipes.md](references/configuration/recipes.md) | You want a pipeline that is ready to use. |
| [configuration/gotchas.md](references/configuration/gotchas.md) | A task behaves in a way that you did not expect. |
| [caching/RULE.md](references/caching/RULE.md) | You need how the cache builds its hash. |
| [caching/remote-cache.md](references/caching/remote-cache.md) | You configure the remote cache. |
| [caching/gotchas.md](references/caching/gotchas.md) | The cache misses, or it hits when it must not. |
| [environment/RULE.md](references/environment/RULE.md) | You declare a key of the environment. |
| [environment/modes.md](references/environment/modes.md) | You choose the mode strict or the mode loose. |
| [environment/gotchas.md](references/environment/gotchas.md) | A file `.env` or a variable of the CI breaks the cache. |
| [filtering/RULE.md](references/filtering/RULE.md) | You run `--affected` or `--filter`. |
| [filtering/patterns.md](references/filtering/patterns.md) | You combine two filters. |
| [ci/RULE.md](references/ci/RULE.md) | You set up the pipeline of the CI. |
| [ci/github-actions.md](references/ci/github-actions.md) | The CI is GitHub Actions. |
| [ci/vercel.md](references/ci/vercel.md) | The CI is Vercel, or you need `turbo-ignore`. |
| [ci/patterns.md](references/ci/patterns.md) | You build a strategy around `--affected`. |
| [cli/RULE.md](references/cli/RULE.md) | You need the basics of `turbo run`. |
| [cli/commands.md](references/cli/commands.md) | You need a flag, or a command other than `run`. |
| [best-practices/RULE.md](references/best-practices/RULE.md) | You need the types, and the pattern to avoid. |
| [best-practices/structure.md](references/best-practices/structure.md) | You lay out the repository, or a `tsconfig`. |
| [best-practices/packages.md](references/best-practices/packages.md) | You create an internal package. |
| [best-practices/dependencies.md](references/best-practices/dependencies.md) | You place a dependency. |
| [watch/RULE.md](references/watch/RULE.md) | You run `turbo watch`, or you need an interruptible task. |
| [boundaries/RULE.md](references/boundaries/RULE.md) | You isolate a package, or you write a rule of a tag. |

Read one reference file for your task. Do not read the whole folder.
