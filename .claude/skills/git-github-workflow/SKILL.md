---
name: git-github-workflow
description: Use this skill when you need to perform Git-related tasks on this project.
---

# Git & GitHub workflow skill

This skill is the single source of truth for how the **Artifactory** monorepo performs version control. All Git/GitHub operations are executed by the `git-manager` subagent, which follows this procedure exactly.

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
2. **Inspect before committing.** Run `rtk git status` and `rtk git diff` to confirm what will be committed. Stage intentionally; do not blindly `rtk git add -A` if unrelated changes are present — report anything unexpected instead.
3. **Commit as the GitHub App.** There is no local `rtk git commit`: the Conventional-Commit is created server-side via the Git Data API so it lands **Verified** and authored by the app's bot. Follow "Committing & opening the PR as the GitHub App" below, then sync local state to the updated ref.
4. **Push:** the file changes reach the remote when the branch ref is updated through the API (see the app-commit flow); after that, `rtk git fetch` + `rtk git reset --hard` so the local branch matches the server-side commit. No separate `rtk git push` of a local commit is needed.
5. **Open the PR as the app**, using the installation token, including:
   - `## Summary` — what changed and why.
   - `## Test plan` — a checklist of how the change was/should be verified.
   - `Closes #N` when the prompt references an issue.
6. **Never merge.** The PR is left pending human review.

## Committing & opening the PR as the GitHub App

Commits and PRs are made **on behalf of a dedicated GitHub App** so the commit is **Verified** and authored by the app's bot. The app's credentials live in a git-ignored **`.env.commiter`** file in the repo root, containing `GIT_COMMIT_APP_ID`, `GIT_COMMIT_APP_PRIVATE_KEY` (base64-encoded PEM), and `GIT_COMMIT_APP_INSTALLATION_ID`. The repo is `GitOpsLovers/artifactory`.

Run everything through `rtk`. The mechanism (replacing the plain `git commit` and `gh pr create`):

1. **Load credentials:** `set -a; source .env.commiter; set +a`. If the file or any of the three variables is missing, STOP and report it — do not fall back to a local user commit.
2. **Materialize the private key:** decode `GIT_COMMIT_APP_PRIVATE_KEY` (base64) into a temp PEM file outside the repo (e.g. under `$TMPDIR`), `chmod 600`, and remove it at the end (even on failure).
3. **Mint a JWT (RS256):** header `{"alg":"RS256","typ":"JWT"}` and payload `{"iat":<now-60>,"exp":<now+540>,"iss":"<GIT_COMMIT_APP_ID>"}`, each base64url-encoded (base64 with `+`→`-`, `/`→`_`, `=` and newlines stripped); sign `header.payload` with `openssl dgst -sha256 -sign <pem>`, base64url the signature; `JWT=header.payload.signature`.
4. **Exchange for an installation token:** `POST https://api.github.com/app/installations/$GIT_COMMIT_APP_INSTALLATION_ID/access_tokens` with `Authorization: Bearer $JWT`; read `.token`. Treat it as a short-lived secret; use it as `GH_TOKEN` for the `gh api` calls below and for the PR.
5. **Resolve the bot identity:** `GET /app` (with the JWT) → `.slug`; author/committer name = `<slug>[bot]`; get the bot user id via `gh api /users/<slug>%5Bbot%5D --jq .id`; email = `<id>+<slug>[bot]@users.noreply.github.com`.
6. **Create the Verified commit via the Git Data API** (all with `GH_TOKEN=$installation_token`, owner/repo `GitOpsLovers/artifactory`):
   a. Determine the changed files from the working tree (`git status --porcelain`, `git diff --name-status`) — additions, modifications, deletions, renames.
   b. Base SHA = the new branch's current tip (create the branch ref from `main`'s tip first with `POST git/refs` if it doesn't exist remotely).
   c. For each added/modified file, create a blob (`POST git/blobs`, base64 content). 
   d. Create a tree (`POST git/trees`) on top of the base commit's tree: blob entries with the correct mode (`100644`, or `100755` for executables); deletions as entries with `sha: null`.
   e. Create the commit (`POST git/commits`) with the Conventional-Commit message, the new tree, parent = base SHA, and explicit `author` and `committer` = the bot identity from step 5. GitHub signs it → **Verified**.
   f. Update the branch ref (`PATCH git/refs/heads/<branch>`) to the new commit SHA.
7. **Sync local state:** `git fetch origin <branch>` then `git reset --hard origin/<branch>` so the local branch matches the server-side Verified commit (the working-tree changes are now captured in that commit).
8. **Open the PR as the app:** `GH_TOKEN=$installation_token rtk gh pr create …` with the usual `## Summary` / `## Test plan` / `Closes #N`. Because the installation token authenticates as the app, the PR is attributed to the app too.
9. **Cleanup:** remove the temp PEM and clear the token variables.

If the installation lacks **Contents: write** or **Pull requests: write**, the API calls will fail — report the failure clearly rather than falling back to a user commit.

## Confirmation & safety rules

1. **Branch, commit, push, and open the PR by default.** These are the normal steps of the workflow — carry them out without asking the caller to confirm, including `rtk git push`. The one hard stop is merging.
2. **Never merge automatically**, force-push, rewrite published history, or delete branches unless the prompt explicitly instructs it.
3. **Run every bash/CLI command through RTK.** Prefix all shell commands — including every `git` and `gh` invocation — with `rtk`. Never invoke a CLI tool directly.
4. **Never run ESLint** — that is the user's responsibility.
5. **Do not install dependencies** and **do not spawn other agents.**
6. **Do not author product code, tests, or docs.** Version control only. If the diff needed for the commit isn't present, report that back instead of creating it.
7. **Never fall back to a local/user-authored commit.** If any part of the app-commit flow fails (missing `.env.commiter` or variables, JWT/token exchange failure, missing **Contents: write** / **Pull requests: write** permission), STOP and report the failure — do not create a plain local commit as the git/gh user.
