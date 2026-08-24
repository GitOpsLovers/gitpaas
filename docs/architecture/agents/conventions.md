# Conventions

## The sections of an agent file

The six files of `.claude/agents/` share one shape, so a subagent that starts cold finds the same section in the same order in every file. A file opens with the frontmatter (`name`, `description`, `tools`, `model`), then holds five sections in this order.

| The section                  | It holds                                                                                                                                 |
|------------------------------|------------------------------------------------------------------------------------------------------------------------------------------|
| `# <Name> specialist`        | The title, and no more.                                                                                                                  |
| `## What you own`            | The one job of the agent, its border against the neighbor agents, and the license it does not have.                                      |
| `## The skill that you load` | The skill of the job that the agent always loads, and the skills of the reference it may equip.                                          |
| `## How you work`            | The method: what the agent reads first, the tool it prefers, and the rule that keeps its diff small.                                     |
| `## How you verify`          | The command that closes the task, and the rule of the verification of `CLAUDE.md` when it applies.                                       |
| `## The report`              | A table of five fields, the same fields in the same order in every file: **Changed**, **Verified**, **Open**, **Follow-ups**, **Notes**. |

The `description` of the frontmatter states the triggers of the agent and the neighbor agent that takes the task it refuses, because the orchestrator loads every description at once and picks by that text alone; `.claude/skills/agent-orchestration/references/which-agent.md` reads those descriptions the same way.

## The rule of the source

`CLAUDE.md` holds three things alone: the role of an agent, the stack, and the rule that every agent obeys. An agent file holds no copy of a rule that `CLAUDE.md` already states; it links the section of `CLAUDE.md` instead. This is why every file of `.claude/agents/` reads "Section 2 of `CLAUDE.md` gives the rule of the two tiers", and not a restatement of that rule. The same border holds between a skill of the job and the page of `docs/architecture/` that it routes to: the skill carries the table of pointers, and the page of `docs/architecture/` carries the rule.

## The rule of the skill

Every agent file names the skill of the job that it always loads, before it touches a file of the area that the skill covers. `implementer`, `refactorer` and `tester` name `backend-architecture` or `frontend-architecture` for a file of `apps/`; `documenter` names the same pair for a page that documents `apps/`, and `project-documentation` for every page it writes; `git-manager` names `git-github-workflow` alone. A skill of the reference — `turborepo`, `vitest`, `tailwind-4-docs`, `typescript-advanced-types` and `tailadmin-ui-patterns` — is optional, and the report of the agent names it and the reason in the field **Notes** when it equips one. `CLAUDE.md` gives the rule that the skill of the job wins when the two disagree.

## The rule of the verification

Every agent that writes code or a document runs one check before it reports, and the check matches the border of its job.

- `implementer`, `refactorer` and `tester` apply the rule of the verification of `CLAUDE.md`: `rtk pnpm run check-types --filter @gitpaas/<app>` for one application that a task touched a file of, and `build` too, and only, when the task changes a file of the build or of the compiler. `tester` also runs the suite of the app with the command of `package.json`.
- `documenter` runs the four checks of `references/checks.md` of `project-documentation`, and applies the rule of the verification of `CLAUDE.md` too, but only when it added a TSDoc comment, to confirm the comment did not break compilation.
- `researcher` writes no code, so it verifies with evidence instead: every finding of its report cites a `path:line`, a `grep`, or an `LSP` result.
- `git-manager` verifies with the check that closes the workflow of the skill it loads: the branch pushed, and the URL of the Pull Request returned.

Every agent but `git-manager` reports "You run no `git` and no `gh` command that changes state." `git-manager` is the one exception, and `.claude/skills/git-github-workflow/` is the one skill that lets it run such a command.
