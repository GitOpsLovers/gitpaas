---
name: git-github-workflow
description: Use this skill when you need to perform Git-related tasks on this project.
---

# Git & GitHub workflow skill

This skill is the single source of truth for how the **GitPaaS** monorepo performs version control. All Git/GitHub operations are executed by the `git-manager` subagent, which follows this procedure exactly.

## Branch strategy & naming

- **Trunk-based on `main`. Never commit directly to `main`.** Every task starts by branching from the latest `main`. If already on a suitable non-`main` feature branch
  for the current task, reuse it; otherwise `git checkout main`, pull the latest (with `--rebase`), then `git checkout -b <type>/<description>`.
- **Branch naming:**
  - `feat/<short-description>`  — new features
  - `fix/<short-description>`   — fixes
  - `chore/<short-description>` — maintenance
  - `docs/<short-description>`  — documentation

## Commit messages

[Conventional Commits](https://www.conventionalcommits.org/) — `type(scope): short description` (types: `feat`, `fix`, `refactor`, `chore`, `docs`, `test`). Subject line ≤ 72 characters. Add a body when the diff is large.

## RTK rule

**Run every bash/CLI command through RTK.** Prefix all shell commands — including every `git` and `gh` invocation — with `rtk` (e.g. `rtk git checkout -b feat/x`,
`rtk git status`, `rtk git push -u origin <branch>`, `rtk gh pr create`, `rtk pnpm run test`). Never invoke a CLI tool directly.

## Tests before committing

The project convention is to run `rtk pnpm run test` (or the affected app's tests) before committing and confirm it passes. Run it when the working tree has code changes, and report the result. **Never run E2E tests, and never use Playwright / browser automation** — it is disallowed in this project. If tests fail, do not commit; report the failure.

## Standard sequence

1. **Branch from latest `main`.** If already on a suitable non-`main` feature branch for this task, reuse it; otherwise `rtk git checkout main`, pull the latest, then
   `rtk git checkout -b <type>/<description>`.
2. **Stage intended files only.** Run `rtk git status` and `rtk git diff` to confirm exactly which files should be committed, then `rtk git add <paths>`. Never blind `rtk git add -A` when unrelated changes are present. Report anything unexpected instead of including it.
3. **Commit** with a Conventional-Commit message: `rtk git commit -m "type(scope): subject"` (add a body with additional `-m` args, or `-F <file>`, when the diff is large).
4. **Push:** `rtk git push -u origin <branch>`.
5. **Open the PR:** `rtk gh pr create --base main --head <branch> --title "type(scope): subject" --body-file <path>`, with the usual `## Summary` / `## Test plan` / `Closes #N`.
6. **Never merge.** The PR is left pending human review.

## Committing & opening the PR

Commits and PRs are made with plain `git` + `gh`, authenticated as the developer via their existing local git/gh configuration — no tokens, credentials files, or identity overrides. The repo is `GitOpsLovers/gitpaas`. Run everything through `rtk`:

1. **Branch** from the latest `main` per the branch-strategy section above.
2. **Stage** only the intended files (`rtk git add <paths>`); do not blind-add unrelated changes.
3. **Commit** with a Conventional-Commit message, using the developer's ambient git config for author/committer:

   ```
   rtk git commit -m "type(scope): subject"
   ```

   Add a body with additional `-m` args (or `-F <file>`) when the diff is large.
4. **Push** the branch to the remote:

   ```
   rtk git push -u origin <branch>
   ```
5. **Open the PR**, including the usual `## Summary` / `## Test plan` / `Closes #N`:

   ```
   rtk gh pr create --base main --head <branch> --title "type(scope): subject" --body-file <path>
   ```
6. **Never merge.** Leave the PR pending human review.

## Confirmation & safety rules

1. **Branch, commit, push, and open the PR by default.** These are the normal steps of the workflow — carry them out without asking the caller to confirm, including `rtk git push`. The one hard stop is merging.
2. **Never merge automatically**, force-push, rewrite published history, or delete branches unless the prompt explicitly instructs it.
3. **Run every bash/CLI command through RTK.** Prefix all shell commands — including every `git` and `gh` invocation — with `rtk`. Never invoke a CLI tool directly.
4. **Never run ESLint** — that is the user's responsibility.
5. **Do not install dependencies** and **do not spawn other agents.**
6. **Do not author product code, tests, or docs.** Version control only. If the diff needed for the commit isn't present, report that back instead of creating it.
7. **Follow the project's commit conventions.** Use the Conventional-Commit format and branch-naming rules above; commit under the developer's own git identity via plain `git`/`gh`. Do not force-push, rewrite published history, or merge without explicit instruction.
