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

[Conventional Commits](https://www.conventionalcommits.org/) — `type(scope): short description` (types: `feat`, `fix`, `refactor`, `chore`, `docs`, `test`). Subject line ≤ 72 characters.

## Specification delta

This project uses [OpenSpec](https://openspec.dev/). A task that changes behavior carries a change folder at `openspec/changes/<change-id>/`. If the prompt names one, apply the five rules below. If the prompt names no change folder, skip this section.

1. **Name the branch after the change identifier.** Take the identifier, and add the branch type. The change `add-remember-me` gives the branch `feat/add-remember-me`. Keep the identifier unaltered, so the branch, the change folder and the Pull Request stay easy to match. Pick the type by the kind of work (`feat`, `fix`, `chore`, `docs`).
2. **Stage the change folder in the first commit of the branch.** `rtk git add openspec/changes/<change-id>/` runs together with the `git add` of the code. The specification and the code enter the repository in the same commit. Later commits stage the folder again only if the artifacts changed.
3. **Stage the main specifications too.** The `/opsx:sync` command edits `openspec/specs/`. If those files changed, stage them with the rest.
4. **Name the change folder in the Pull Request body.** See the template below.
5. **Archive after the merge.** See the archive step below.

### The Pull Request body

Add a `## Change` section above `## Summary`:

```
## Change

`openspec/changes/<change-id>/` — see [proposal.md](openspec/changes/<change-id>/proposal.md).

Specification deltas:
- `<capability>/spec.md`

## Summary
...

## Test plan
...

Closes #N
```

List one line per file under `openspec/changes/<change-id>/specs/`. Write "none" if the change adds no delta.

### The archive step

After the merge, the change moves into `openspec/changes/archive/`. Use the `/opsx:archive` command, or run `rtk openspec archive <change-id>`. Do not move the folder by hand, because the command also updates the state that OpenSpec keeps. This step runs on `main`, after the pull of the merge commit.

## RTK rule

**Run every bash/CLI command through RTK.** Prefix all shell commands — including every `git` and `gh` invocation — with `rtk` (e.g. `rtk git checkout -b feat/x`, `rtk git status`, `rtk git push -u origin <branch>`, `rtk gh pr create`, `rtk pnpm run test`). Never invoke a CLI tool directly.

## Standard sequence

1. **Branch from latest `main`.** If already on a suitable non-`main` feature branch for this task, reuse it; otherwise `rtk git checkout main`, pull the latest, then
   `rtk git checkout -b <type>/<description>`.
2. **Stage intended files only.** Run `rtk git status` and `rtk git diff` to confirm exactly which files should be committed, then `rtk git add <paths>`. Never blind `rtk git add -A` when unrelated changes are present. Report anything unexpected instead of including it. If the task carries a change folder, stage `openspec/changes/<change-id>/` too — see the *Specification delta* section.
3. **Commit** with a Conventional-Commit message: `rtk git commit -m "type(scope): subject"`.
4. **Push:** `rtk git push -u origin <branch>`.
5. **Open the PR:** `rtk gh pr create --base main --head <branch> --title "type(scope): subject"`, with the usual `## Change` (only for an OpenSpec change) / `## Summary` / `## Test plan` / `Closes #N`. **Keep PR titles ≤ 60 characters** (including the `type(scope):` prefix) so they read fully in GitHub lists without truncation — tighter than the ≤ 72-char commit subject. Keep the same imperative, lowercase, no-trailing-period Conventional-Commit style; if the summary doesn't fit, shorten the wording.
6. **Never merge.** The PR is left pending human review.

## Committing & opening the PR

Commits and PRs are made with plain `git` + `gh`, authenticated as the developer via their existing local git/gh configuration — no tokens, credentials files, or identity overrides. The repo is `GitOpsLovers/gitpaas`. Run everything through `rtk`:

1. **Branch** from the latest `main` per the branch-strategy section above.
2. **Stage** only the intended files (`rtk git add <paths>`); do not blind-add unrelated changes.
3. **Commit** with a Conventional-Commit message, using the developer's ambient git config for author/committer:

   ```
   rtk git commit -m "type(scope): subject"
   ```

4. **Push** the branch to the remote:

   ```
   rtk git push -u origin <branch>
   ```
5. **Open the PR**, including the usual `## Change` (only for an OpenSpec change) / `## Summary` / `## Test plan` / `Closes #N`:

   ```
   rtk gh pr create --base main --head <branch> --title "type(scope): subject"
   ```

   Keep the PR title concise — **≤ 60 characters**, including the `type(scope):` prefix — so it isn't truncated in GitHub lists (tighter than the ≤ 72-char commit subject in the "Commit messages" section). Use the same imperative, lowercase, no-trailing-period style. If the summary doesn't fit, shorten the wording and move the detail into the PR body rather than the title.
6. **Never merge.** Leave the PR pending human review.

## Confirmation & safety rules

1. **Branch, commit, push, and open the PR by default.** These are the normal steps of the workflow — carry them out without asking the caller to confirm, including `rtk git push`. The one hard stop is merging.
2. **Never merge automatically**, force-push, rewrite published history, or delete branches unless the prompt explicitly instructs it.
3. **Run every bash/CLI command through RTK.** Prefix all shell commands — including every `git` and `gh` invocation — with `rtk`. Never invoke a CLI tool directly.
4. **Never run ESLint** — that is the user's responsibility.
5. **Do not install dependencies** and **do not spawn other agents.**
6. **Do not author product code, tests, or docs.** Version control only. If the diff needed for the commit isn't present, report that back instead of creating it. **Never edit a file of the change folder.** Read it, stage it, and cite it — nothing more.
7. **Follow the project's commit conventions.** Use the Conventional-Commit format and branch-naming rules above; commit under the developer's own git identity via plain `git`/`gh`. Do not force-push, rewrite published history, or merge without explicit instruction.
