# The research of the layer of the agents

The orchestrator read the layer inline, in the conversation of the request. This page holds the measurements and the findings, so `plan.md` stays short.

## 1. What the system does today

### The files of the layer

| The file | Bytes | It loads |
|---|---|---|
| `CLAUDE.md` | 7,054 | In every session, and in every cold start of a subagent |
| `.claude/rules/agent-rules.md` | 4,642 | In every session, as a project instruction |
| `.claude/skills/agent-orchestration/SKILL.md` | 10,827 | When the orchestrator routes a request |
| `.claude/skills/project-documentation/SKILL.md` | 9,729 | When `documenter` writes |
| `.claude/skills/git-github-workflow/SKILL.md` | 3,765 | When `git-manager` runs |
| `.claude/agents/researcher.md` | 8,807 | At the cold start of that agent |
| `.claude/agents/documenter.md` | 7,400 | At the cold start of that agent |
| `.claude/agents/tester.md` | 5,236 | At the cold start of that agent |
| `.claude/agents/implementer.md` | 4,914 | At the cold start of that agent |
| `.claude/agents/refactorer.md` | 3,430 | At the cold start of that agent |
| `.claude/agents/git-manager.md` | 1,721 | At the cold start of that agent |
| The 13 descriptions of the skills | 3,829 | In every session, and in every cold start |
| The 6 descriptions of the agents | 2,270 | In every session, and in every cold start |

### The cost of the fixed context

| The moment | Bytes | Tokens, about |
|---|---|---|
| A session of the orchestrator, before the user speaks | 17,795 | 4,450 |
| The cold start of `documenter`, with its skill | 32,654 | 8,160 |
| The cold start of `tester`, before its skill | 23,169 | 5,790 |
| The cold start of `git-manager`, with its skill | 21,011 | 5,250 |

`.claude/skills/` holds 6.1 MB on the disk. `tailwind-4-docs` alone holds 5.1 MB and 242 files,
and 8 of those files are PNG screenshots.

## 2. The findings

### F1 — The paragraph of `rtk` exists seven times

`CLAUDE.md` states the rule, and each of the six agent files restates it word for word, at about
500 bytes each. A subagent already holds `CLAUDE.md`, so the six copies buy nothing.

**Evidence.** `grep -rl "rtk\` is a proxy that compacts"` gives `CLAUDE.md` and the six files of
`.claude/agents/`.

### F2 — Five agent files order a `Read` of a file that already loads

`implementer`, `refactorer`, `tester`, `researcher` and `documenter` each carry a paragraph that
orders a `Read` of `.claude/rules/agent-rules.md`. That card loads as a project instruction. The
paragraph costs its own bytes, and it then costs a `Read` of 4,642 bytes that the agent already
holds.

**Open point.** The orchestrator confirmed that the card loads in its own session. The first task
of phase 1 must confirm that it also loads in the session of a subagent. If it does not, the five
pointers stay, and `CLAUDE.md` gains one pointer instead of five.

### F3 — The cycle of three phases exists four times

| The file | What it states about the cycle |
|---|---|
| `CLAUDE.md`, section 4 | The two roads, the three phases, the two folders, the three facts of a subagent |
| `.claude/skills/agent-orchestration/SKILL.md`, sections 1 and 2 | The same, in the long form |
| `.claude/skills/project-documentation/SKILL.md` | The three files of the folder and the shape of a phase |
| `docs/architecture/agents/key-flows.md` | The diagram of the flow and the reason of each rule |

### F4 — The shape of a page of the business exists six times

The rule with `SHALL`, and the scenario with `WHEN` and `THEN`, appear in `project-documentation`,
in `agent-orchestration`, in `tester`, in `documenter`, in `researcher` and in
`docs/architecture/agents/key-flows.md`.

### F5 — Eight skills reach no agent

`implementer` and `refactorer` hold the tools `Read, Edit, Write, Grep, Glob, Bash, LSP`, and no
`Skill` tool. They are the two agents that write product code. `documenter`, `tester` and
`git-manager` hold the `Skill` tool, and each file orders them to load one named skill "and no
other". `tester` names `vitest` and forbids it by name.

So five skills reach an agent: `agent-orchestration`, `project-documentation`,
`git-github-workflow`, `backend-unit-testing` and `frontend-unit-testing`. These eight reach none:

| The skill | Bytes of the description | Size on the disk |
|---|---|---|
| `turborepo` | 526 | 164 KB |
| `angular-developer` | 421 | 200 KB |
| `tailwind-4-docs` | 411 | 5,124 KB |
| `vitest` | 358 | 140 KB |
| `nestjs-best-practices` | 332 | 248 KB |
| `typescript-advanced-types` | 315 | 20 KB |
| `tailadmin-ui-patterns` | 307 | 20 KB |
| `backend-feature` | 162 | 4 KB |

Their descriptions cost 2,832 bytes in every session and in every cold start.

### F6 — `researcher` carries two jobs in one file

The file holds 8,807 bytes, and it is the largest agent file. Job 1 is the research of the cycle,
and it answers four questions. Job 2 is the audit, and it carries a method of six steps and a
report of eight sections. The research pays the bytes of the audit at every cold start of the
cycle, and the cycle runs far more often than the audit.

### F7 — `backend-feature` points at a page that holds no content

The skill calls `docs/architecture/backend.md` "the single definitive source of truth" for the
layers, the naming, the ports and the validation. That file holds 15 lines, and it is an index. Its
step 7 names a section "Schema management" of that page, and no such section exists. The content
that the skill wants lives in `docs/architecture/backend/structure.md` and in
`docs/architecture/backend/conventions.md`.

### F8 — The run of `tester` on every phase repeats the work of `implementer`

`agent-orchestration`, step 4, orders one run of `tester` for each phase. Section 4 of the same
file then spends a paragraph on the border between the two agents, and it ends with the order to
"name that border in both prompts, so the two agents write no test two times". A rule that every
prompt must restate is a rule that costs more than it protects. One run of `tester` costs a cold
start of about 5,800 bytes, plus its skill, plus a run of the suite that `implementer` already ran.

### F9 — `.claude/RESUME.md` is a stale checkpoint

The file holds a checkpoint of a session of the 23rd of August 2026. Git does not track it, and
`.claude/.gitignore` does not ignore it.

## 3. The options

### The eight skills that reach no agent

| The option | The cost |
|---|---|
| **A. Delete the eight.** | The layer loses the two skills that hold knowledge of this project, `tailadmin-ui-patterns` and `backend-feature`. |
| **B. Delete the six general ones, and give `implementer` a `Skill` tool for the two of the project.** | One agent gains one tool. The layer keeps the knowledge that the project owns, and it drops the vendored documentation. |
| **C. Keep all eight, and give `implementer` and `refactorer` the `Skill` tool.** | The disk keeps 5.9 MB, and every session keeps 2,832 bytes of description. |

`angular-developer` sits between B and C. Angular v22 moves fast, and its reference on the forms of
the signals holds 905 lines that the model may not know. The user decides whether it stays.

### The trim of the always-on text

| The option | The cost |
|---|---|
| **A. Trim `CLAUDE.md` alone.** | The largest single win, and the smallest risk. The card of the rules stays whole. |
| **B. Merge the card into `CLAUDE.md`.** | One file instead of two. The card is the reference that `implementer` uses most, and a merge makes one long file that every agent loads whole. |
| **C. Split the card by application.** | An agent of the backend never loads the layers of the frontend. It needs a router that the layer does not have today. |

## 4. The answers of the user

The four open points are closed. `plan.md`, section 1, holds the decision of each one.

| The question | The answer |
|---|---|
| Does `.claude/rules/agent-rules.md` load in the session of a subagent? | The question no longer applies. The user decided to merge the card into `CLAUDE.md` and to delete it, because two files scatter one subject (D1). |
| Does the user want `angular-developer` to stay? | Yes. The frontend is Angular, and the skill holds knowledge that the agent needs. `implementer` gains the `Skill` tool and this name (D2). |
| Does the user accept the conditional run of `tester`? | No. `tester` owns the whole test layer. Every phase that changes `apps/` or `packages/` carries a run of `tester`, and `implementer` writes no test (D4). |
| Is `model: inherit` right for `researcher`? | No. The agent runs on Sonnet 5 (D3). |
