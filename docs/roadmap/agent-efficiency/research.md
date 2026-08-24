# Research — the layer of the agents

The scope is the configuration of the AI: `CLAUDE.md`, `.claude/agents/`, `.claude/skills/`, `.claude/settings.json` and `docs/architecture/agents/`. The audit reads no file of `apps/`.

## 1. What the system does today

### The pieces

| The piece | The path | The size |
|---|---|---|
| The rules of every agent | `CLAUDE.md` | 3.4 KB |
| The workflow of the orchestrator | `.claude/skills/agent-orchestration/SKILL.md` | 10.7 KB |
| The six subagents | `.claude/agents/*.md` | 33.9 KB |
| The fifteen skills | `.claude/skills/*/` | 6.1 MB |
| The page of the architecture | `docs/architecture/agents/key-flows.md` | 6.0 KB |

### The size of each agent file

| The agent | The size | The model |
|---|---|---|
| `researcher` | 8.4 KB | inherit |
| `documenter` | 8.0 KB | sonnet |
| `implementer` | 5.9 KB | inherit |
| `tester` | 5.9 KB | sonnet |
| `refactorer` | 4.5 KB | sonnet |
| `git-manager` | 1.2 KB | haiku |

### The load of one request

The orchestrator starts each session with `CLAUDE.md` (3.4 KB), the six descriptions of the agents
(2.3 KB) and the fifteen descriptions of the skills (4.3 KB). That is 10 KB, near 2 500 tokens,
before the user writes one word. `CLAUDE.md` then orders the skill `agent-orchestration`, which adds
10.7 KB, near 2 700 tokens.

A subagent starts cold. It loads `CLAUDE.md` again (3.4 KB), its own file (1.2 KB to 8.4 KB), the
fifteen descriptions of the skills again (4.3 KB), the skill of the architecture that its file names
(3.3 KB to 3.4 KB), and then the page of `docs/architecture/` that the skill routes to. A phase that
uses three subagents pays that base three times.

## 2. The pages of `docs/business/` that this change touches

None. The change alters the configuration of the AI, and it alters no behavior of the product. No
page of `docs/business/` states a rule about the agents.

The change does touch `docs/architecture/agents/key-flows.md`, because that page describes the
workflow that this change alters.

## 3. The findings

### F1 — The layer pays for six skills, and it forbids their use (High)

`angular-developer`, `nestjs-best-practices`, `turborepo`, `vitest`, `tailwind-4-docs` and
`typescript-advanced-types` are curated references of a third-party tool. Five of the six carry a
version in their frontmatter, and `vitest` carries the SHA and the date of its generation.

A search over `.claude/agents/`, over the other files `SKILL.md` and over `CLAUDE.md` finds no
instruction that loads any of them. The single hit is `tester.md:44`, which names `vitest` to forbid
it. Four agent files hold a paragraph that closes the door: `documenter.md:18`, `tester.md:44`,
`implementer.md:23` and `refactorer.md:19` each say, in their own words, "invoke that skill, and no
other".

**The cost is the description, and not the body.** A skill loads its body when an agent invokes it,
and never before. So the six skills cost 2 387 of the 4 300 characters of the descriptions of the
skills, in the orchestrator and in every subagent that holds the tool `Skill`. They cost nothing
else. The 5.0 MB of `tailwind-4-docs/references/docs/` is a local mirror: `references/.gitignore`
ignores it, Git tracks five files of that skill, and `scripts/sync_tailwind_docs.py` regenerates it.

So the layer pays the price of the offer, then it spends four more paragraphs to refuse the offer,
and it gains nothing from either payment.

Two properties make the six descriptions expensive for what they carry.

1. **They are long.** `turborepo` holds 530 characters, `angular-developer` 425, `tailwind-4-docs`
   415, `vitest` 362, `nestjs-best-practices` 336 and `typescript-advanced-types` 319. The two
   descriptions that the project wrote itself hold 121 and 120.
2. **They state no border.** `vitest` and `frontend-unit-testing` both answer "how do I write a
   spec"; `tailwind-4-docs` and `tailadmin-ui-patterns` both answer "which class"; `angular-developer`
   and `frontend-architecture` both answer "where does this component go". Only
   `frontend-architecture` and `tailwind-4-docs` name the other skill. An agent that reads the other
   four cannot tell which one wins.

### F2 — The workflow is written three times (High)

| The file | What it states |
|---|---|
| `CLAUDE.md`, section "Find your role" | The two roles, and the order to load the skill. |
| `.claude/skills/agent-orchestration/SKILL.md` | The two roads, the four steps, the table of the agents, the rules of the prompt. |
| `docs/architecture/agents/key-flows.md` | The same flow as a diagram, the same table of the agents, and the reason of each border. |

The shape of `plan.md` is written two times: `agent-orchestration/SKILL.md` section "Step 3", and
`project-documentation/SKILL.md` section "The roadmap". The two copies already differ. The skill of
the orchestration names three parts; the skill of the documentation names three parts and adds the
template of a phase.

The duty of the last phase is written three times: `agent-orchestration/SKILL.md`,
`documenter.md:40` and `project-documentation/SKILL.md`.

### F3 — The agent files repeat one another (High)

Five of the six agent files carry the same four blocks, in different words:

- The preamble of the cold start. "You are invoked with a fresh, isolated context…" appears in five
  files.
- The rule of the scope. "Stay in scope. Report unrelated bugs instead of fixing them" appears in
  five files.
- The commands of the verification. `implementer.md:59-60` and `refactorer.md:37-38` hold the same
  four commands.
- The table of the report. Five tables hold the fields **Changed**, **Verified**, **Open**,
  **Follow-ups** and **Notes**, with a different order and a different wording in each file.

### F4 — A route points at an index page (Medium)

`backend-feature/SKILL.md` orders "Read `docs/architecture/backend.md` before writing anything", and
it repeats the order four times. That file holds 15 lines, and it is an index that lists the five
subpages. It carries no layer, no naming and no rule.

The agent that obeys reads a page that answers nothing, and then it looks for the real page. The
skill `backend-architecture` already routes to the correct subpage.

### F5 — The verification runs the same build two times (Medium)

`implementer.md` and `refactorer.md` offer a type check and a build for each application.

| The application | `check-types` | `build` |
|---|---|---|
| `@gitpaas/backend` | `tsc -p tsconfig.json --noEmit` | `nest build` |
| `@gitpaas/frontend` | `ng build --configuration development` | `ng build` |

On the frontend the two commands both run a complete Angular build. On the backend `nest build`
compiles the same files that `tsc --noEmit` reads. An agent that runs both compiles the application
two times, and it gains nothing.

`tester.md:51` and `tester.md:62` give `rtk ng test --watch=false` for the frontend, while the script
`test` of `apps/frontend/package.json` already holds `ng test --watch=false`. Two commands for one
action let an agent pick the one that the project does not maintain.

### F6 — The routing table names a page, and not a size (Medium)

The tables of `backend-architecture` and of `frontend-architecture` name a page and often a section.
They give no size, so an agent cannot judge the cost before it reads.

`docs/architecture/backend/key-flows.md` holds 295 lines and 33 KB. An agent that reads it whole
spends near 8 000 tokens to learn one flow. `docs/business/providers.md` holds 39 KB, and
`documenter` reads it in the last phase of a feature of the providers.

`CLAUDE.md` already states the correct method: find the line with `Grep -n`, then read the range with
`Read`. No routing table repeats that method at the place where the agent chooses the page.

### F7 — The user has no command, and one delivery serves two kinds of work (Medium)

`.claude/commands/` does not exist. The user starts the cycle by prose, and the orchestrator decides
the road alone. The cycle then stops at three gates: the approval of `TODO.md`, the approval of
`research.md`, and the approval of `plan.md`. The user cannot re-run one step, because no step has a
name that the user can type.

`agent-orchestration/SKILL.md` also opens with one rule for every request: "Every task ends with a
Pull Request." The direct road of that file takes a question, a document, a configuration, a test, a
refactor and a bug fix, and it gives each one a branch, a commit, a push and a Pull Request. A change
of one line therefore pays the start of `git-manager`, a page of GitHub and a review, for a diff that
the user already reads in the terminal.

The two problems have one shape: the layer holds one workflow, and the work holds two kinds.

### F8 — The orchestration file mixes the rule and the reason (Low)

`agent-orchestration/SKILL.md` holds 223 lines. Near 60 of them explain why a rule exists: why a
subagent starts cold, why a pasted file costs two times, why the plan belongs to the orchestrator.

That reason is valuable one time, for a person. It reloads on every request, for a machine that
already obeys the rule. `docs/architecture/agents/key-flows.md` is the place that holds a reason, and
it already holds the same three reasons.

## 4. The options

### Option A — Trim the text, and keep the shape

Open the six reference skills to the agents, shorten their descriptions, cut the duplication between
the agent files, and shorten `agent-orchestration/SKILL.md`. The six agents stay, the cycle stays,
the three gates stay.

- **Cost:** low. It touches no flow.
- **Gain:** near 2.4 KB of descriptions in every context, near 40 % of the agent files, and a
  reference that an agent may reach.
- **Risk:** low. A cut that goes too deep removes a rule that an agent needs. A door that opens too
  wide lets an agent load a reference that it did not need.

### Option B — Trim the text, and split the layer into two workflows

Option A, and a border between two workflows. The workflow of the day stays a conversation with the
orchestrator, and it invokes no `git-manager`. The workflow of the SDD becomes three commands,
`/research`, `/plan` and `/implement`, and each command runs one step and stops.

- **Cost:** medium. It adds the folder `.claude/commands/`, and the page of the architecture must
  describe the two workflows.
- **Gain:** the gain of A; a small change that pays for no branch; a cycle that the user drives with
  three words instead of prose; and a step that the user can re-run alone.
- **Risk:** medium. The border between the two workflows must be clear, or a feature starts in the
  workflow of the day and it ships with no specification.

### Option C — Merge the agents

Reduce six subagents to three: one that writes code, one that reads, one that delivers.

- **Cost:** high. It rewrites every agent file and the page of the architecture.
- **Gain:** fewer cold starts for a phase that spans two jobs.
- **Risk:** high. `docs/architecture/agents/key-flows.md` states that the three borders between
  `implementer`, `refactorer` and `tester` catch a slip that one broad agent misses. The merge loses
  that check, and it loads the caution of three jobs on every task.

## 5. What is unknown

1. Which project skill wins over which reference skill? The plan gives five pairs. Does the user
   agree with each pair?
2. Which command writes `TODO.md` when the folder of the feature does not exist yet? The plan gives
   that duty to `/research`.
3. Does `git-manager` keep the model `haiku`, and do `implementer` and `researcher` keep `inherit`?
4. Should `docs/architecture/agents/` grow a page `structure.md` and a page `conventions.md`, so the
   area matches the five other areas of `docs/architecture/`?
