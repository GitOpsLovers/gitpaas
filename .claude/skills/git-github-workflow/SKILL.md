---
name: git-github-workflow
description: Use this skill when you need to perform Git-related tasks on this project.
---

# Git & GitHub workflow skill

This skill is the single source of truth for version control in the **GitPaaS** monorepo. The `git-manager` subagent executes it. The repository is `GitOpsLovers/gitpaas`.

Every command runs through `rtk`, as section 2 of `CLAUDE.md` requires: `rtk git status`, `rtk gh pr create`.

## Naming

| The item           | The rule                                                                                                        |
|--------------------|-----------------------------------------------------------------------------------------------------------------|
| Branch             | `<type>/<short-description>`, with `type` one of `feat`, `fix`, `chore`, `docs`.                                |
| Commit subject     | `type(scope): subject`, in [Conventional Commits](https://www.conventionalcommits.org/). 72 characters maximum. |
| Pull Request title | The same subject, 60 characters maximum, so GitHub shows it in full.                                            |

Write the subject in the imperative and in lower case, and add no final period. If the subject does not fit, shorten the words, and move the detail into the body of the commit.

## The procedure

1. **Branch from the latest `main`.** If the current branch fits the task and is not `main`, reuse it. If not, run `rtk git checkout main`, `rtk git pull --rebase`, then `rtk git checkout -b <type>/<description>`.
2. **Read the working tree.** Run `rtk git status --short` and `rtk git diff --stat` in one call.
3. **Stage the intended paths alone.** Run `rtk git add <paths>`. Never run `git add -A` when the tree holds an unrelated change. Report the unexpected file instead of staging it.
4. **Commit.** Run `rtk git commit -m "type(scope): subject" -m "<body>"`. The ambient Git configuration of the developer gives the author.
5. **Push.** Run `rtk git push -u origin <branch>`.
6. **Open the Pull Request.** The Pull Request carries a title alone, and no body:

   ```
   rtk gh pr create --base main --head <branch> --title "type(scope): subject"
   ```

7. **Stop.** Never merge the Pull Request. A human reviews it.

## The feature of the roadmap

A task that changes behavior carries a folder at `docs/roadmap/<feature>/`. If the prompt names one, add these three rules to the procedure. If the prompt names none, skip this section.

1. **Step 1 — name the branch after the feature.** The feature `add-remember-me` gives the branch `feat/add-remember-me`. Keep the name unaltered, and pick the type by the kind of work. One phase gives one branch, so the subject of the commit names the phase.
2. **Step 3 — stage the folder of the feature with the code.** Add `docs/roadmap/<feature>/`, so the plan and the code enter the repository in the same commit. A later commit stages the folder again only if a file of it changed. The last phase deletes that folder and writes `docs/business/`; stage the deletion and the new page together.
3. **Step 4 — read `plan.md` for the body of the commit.** Read it; never edit it. The body names the feature and the phase, because the Pull Request carries no body.

## The limits

1. **Branch, commit, push and open the Pull Request without a confirmation.** These are the normal steps. Merging is the one hard stop.
2. **Never merge, never force-push, never rewrite published history, and never delete a branch**, unless the prompt gives the instruction.
3. **Author no product code, no test and no document.** If the commit needs a change that the tree does not hold, report the absence, and write nothing.
4. **Edit no file of the change folder.** Read it, stage it, and cite it.
5. **Never pass `--body`, `--body-file` or `--fill` to `gh pr create`.** The Pull Request carries the title alone. A body repeats the diff that the reviewer already reads, and it costs the tokens of a second summary. Give the detail in your report to the caller instead.
