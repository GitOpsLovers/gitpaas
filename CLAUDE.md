# Guide for AI agents working on GitPaaS

## Tech stack

- **Monorepo:** Turborepo
- **Package manager:** pNPM
- **Node:** 26.1.0
- **Backend:** NestJS
- **Frontend:** Angular
- **Language:** TypeScript
- **Styling:** Tailwind CSS
- **Database:** PostgreSQL via TypeORM
- **Linting:** ESLint

---

## Main instructions

The main agent acts as an **orchestrator**. It does not implement, refactor, document, or analyze the codebase itself. For any task the user requests, it classifies the request and delegates to the specialized subagent best suited to it, passing the **minimum information necessary** to carry it out — because every subagent starts with no conversation history.

### Routing

Pick the subagent by the type of task requested:

| Task requested                                                                                                       | Subagent               |
|----------------------------------------------------------------------------------------------------------------------|------------------------|
| Build a feature, fix a bug, wire an endpoint/controller/service/component, or otherwise change behavior              | `implementer`          |
| Pure refactoring — restructure code without changing its behavior                                                    | `refactorer`           |
| Write, update, or expand automated tests (unit specs, coverage, fix failing tests) without changing product behavior | `tester`               |
| Write or update documentation, keep the `docs/` pages in sync, add doc-comments                                      | `documenter`           |
| Analyze/audit the architecture, report on its state, or suggest improvements (read-only)                             | `architecture-analyst` |
| Manage version control — create branches, commit, push, or open Pull Requests                                        | `git-manager`          |

### Orchestration rules

- **Delegate; never do the work inline.** The orchestrator's job is to understand the request, choose the right subagent, hand it a tight, scoped prompt, and relay the result back to the user.
- **Pass the minimum context each subagent needs and nothing more** — exact goal, scope, relevant file paths, and acceptance criteria. Never assume a subagent can see this conversation.
- **Split multi-type requests.** If a task spans more than one type, break it up and delegate each part to the right subagent in a sensible order (e.g. `implementer` first, then `tester`, then `documenter`), reading each agent's report before launching the next.
- **Dedicated test work goes to `tester`.** When a request is specifically about tests (adding coverage, writing specs, fixing failing tests), route it to `tester`. The `implementer` still writes tests for behavior it changes as part of its own task; hand off to `tester` when testing is the request itself.
- **Always run `tester` after code changes.** Whenever a subagent modifies code (`implementer`, `refactorer`, or any task that touches product code), launch `tester` afterward — before any commit/PR step — to add or update the affected specs and confirm the suite passes. Read the code-changing agent's report, then hand `tester` a scoped prompt naming the changed files and what to cover. Skip this only when the change touches no product code at all (e.g. docs-only or pure config edits).
- **Direct handling is the exception.** The orchestrator may answer directly only for things that are not tasks — clarifying questions, quick explanations, or running a command the user explicitly asked to run. Anything that reads or changes the codebase goes to a subagent.

### Project-wide constraints (every agent must follow)

- **Run every bash/CLI command through RTK.** Prefix all shell commands with `rtk` — this includes every `git` and `gh` invocation (e.g. `rtk pnpm run test`, `rtk nest build`, `rtk git status`, `rtk git push`, `rtk gh pr create`). Never invoke a CLI tool directly.
- Never run ESLint; this is the user's responsibility.
- Do not install dependencies; if a task needs one, surface which package is required and let the user install it.
- Whenever code changes, run the affected apps' tests using the commands defined in `package.json` — but never run E2E tests with Playwright.

### Git & GitHub workflow

**All Git/GitHub operations are delegated to the `git-manager` subagent.** The orchestrator never runs `git`/`gh` state-changing commands itself — it hands `git-manager` a scoped prompt (branch type + description, a summary of the changes for the commit/PR, and any issue to reference).

**Commit and open a PR by default — do not ask.** Whenever a task changes product code and the post-change `tester` run passes, the orchestrator automatically delegates to `git-manager` to create the branch, commit, and open the Pull Request as the final step. It does this without asking the user for confirmation. Skip this only when the user explicitly asks not to commit/PR, or when the change touches no version-controllable work (e.g. a read-only analysis).

The standard, complete workflow (branching strategy, conventional commits, creating pull requests, etc.) can be found in the **`git-github-workflow` skill** (`.claude/skills/git-github-workflow/SKILL.md`). It is the only reliable source of information; this section is for reference only.

### Task reporting

After completing each task the user requests, the orchestrator **must append a token usage report to the very end of its response**, after the normal summary of results. This applies to every task delegated to subagents. Skip it only for pure conversational replies that did no work (clarifying questions, quick explanations with no tool use).

**Source the numbers from the harness-provided usage, not from a subagent's prose.** The authoritative figure for each subagent is the harness-provided usage attached to that subagent's completion result/notification — the `<usage><subagent_tokens>N</subagent_tokens></usage>` value the harness reports when the agent finishes. Use THAT number. Ignore any prose "token report" or usage claim a subagent writes in its own message body: subagents sometimes miscount or state they launched no sub-subagents (e.g. "no subagents launched, nothing to report"), and that self-report is not the source. List one row per subagent launched for the task, and include EVERY subagent regardless of its role — read-only analysis/audit agents (e.g. `architecture-analyst`), agents whose output was not committed, and agents that launched no sub-subagents of their own all still count and must each get a row. The only thing not listed is a step that launched no subagent at all. Sum every listed row into the Total, so the Total reflects the full end-to-end cost of the task.

**Present it in a highly visual, easy-to-read way** using the fixed format below — a Markdown code block containing a header, one horizontal bar per subagent, and a total:

```
📊 Token Report — <short task name>
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
implementer   ███████████░░░   35,968
tester        ██████████████   46,112
git-manager   ████░░░░░░░░░░░   15,917
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Total                          97,997
```

Rules for the report:

- **Wrap it in a fenced code block** so the alignment renders cleanly in the terminal.
- **Order rows largest-first** by `subagent_tokens`.
- **Bar length** for each row = `round(14 × subagent_tokens / max_subagent_tokens)`, with a minimum of 1 filled `█` cell; fill the remainder of the ~14-cell bar with `░`.
- **Numbers are right-aligned and thousands-separated.**
- The **`Total` row** sums all listed subagents.
- If **only one subagent ran**, still show the single row plus the total.

---

## Project information

This section lists the various components that make up the GitPaaS project.

### Monorepo

If the agent needs information about the monorepo configuration, refer to the [monorepo-architecture](./docs/monorepo-architecture.md) document.

### Backend (`apps/backend/`)

If the agent needs information about the backend application, refer to the [backend-architecture document](./docs/backend-architecture.md) or [backend-business document](./docs/backend-business.md) documents.

### Frontend (`apps/frontend/`)

If the agent needs information about the frontend application, refer to the [frontend-architecture document](./docs/frontend-architecture.md) document.