---
name: git-github-workflow
description: Every operation of Git and of GitHub of this project - the branch, the commit, the push and the Pull Request. The agent `git-manager` executes it.
---

# Git and GitHub

The single source of truth for the version control of the monorepo of GitPaaS. The subagent `git-manager` executes it, and no other agent runs a command of Git that changes state. The
repository is `GitOpsLovers/gitpaas`. Every command runs through `rtk`.

## The two rules of every Pull Request

1. **The Pull Request is a draft.** Pass `--draft`.
2. **The Pull Request carries no body.** Pass `--body ""`, and put no character between the two quotation marks. Pass no other flag that fills the body, and never edit the body after the creation. `limits.md` names each forbidden flag.

Read the three files in this order: `naming.md`, `procedure.md`, then `limits.md`. Read `roadmap-feature.md` only when the prompt names a folder `docs/roadmap/<feature>/`.

## The reference files

| The file | Read it when |
| --- | --- |
| [naming.md](references/naming.md) | You name a branch, a subject of a commit, or a title of a Pull Request. |
| [procedure.md](references/procedure.md) | You run the delivery. It holds the seven steps, from the branch to the Pull Request. |
| [roadmap-feature.md](references/roadmap-feature.md) | The prompt names a folder `docs/roadmap/<feature>/`. It adds three rules to the procedure. |
| [limits.md](references/limits.md) | You need what you must never do: merge, force-push, rewrite history, or write a file. |
