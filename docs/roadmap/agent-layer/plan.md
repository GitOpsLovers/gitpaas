# The plan of the optimization of the layer of the agents

## 1. The decisions

### D1 — One rule lives in one file, and every other file points at it

The layer keeps its files. It loses the copies. Each rule gets one owner.

| The rule | Its owner | Every other file |
|---|---|---|
| The prefix `rtk`, the ESLint, the dependencies, the tests | `CLAUDE.md`, section 2 | States nothing |
| The layers, the dependencies, the aliases, the tests | `.claude/rules/agent-rules.md` | States nothing |
| The routing, the cycle, the grouping, the prompt | `.claude/skills/agent-orchestration/SKILL.md` | Points at it |
| The map of `docs/`, the shape of a page and of a file of the roadmap | `.claude/skills/project-documentation/SKILL.md` | Points at it |
| The branch, the commit, the Pull Request | `.claude/skills/git-github-workflow/SKILL.md` | Points at it |
| The reason of each rule of the layer | `docs/architecture/agents/` | Points at it |

**Refused: the merge of the card of the rules into `CLAUDE.md`.** One file is simpler to hold, but
every subagent would then load the layers of the two applications whole. The card is the reference
that a subagent opens most, and `CLAUDE.md` is the file that every subagent loads. Two files keep
the always-on text small.

### D2 — The layer keeps five skills, and it deletes six

The layer keeps a skill that holds knowledge of this project. It deletes a skill that holds a
vendored copy of a public documentation.

| The skill | The decision | The reason |
|---|---|---|
| `agent-orchestration` | Keep | The orchestrator invokes it. |
| `project-documentation` | Keep | `documenter` invokes it. |
| `git-github-workflow` | Keep | `git-manager` invokes it. |
| `backend-unit-testing` | Keep | `tester` invokes it. Its references hold the conventions of this repository. |
| `frontend-unit-testing` | Keep | `tester` invokes it. Same reason. |
| `tailadmin-ui-patterns` | Keep, and wire it | 20 KB, and it holds the classes of this frontend. `implementer` gains the `Skill` tool. |
| `backend-feature` | Keep, wire it, and correct it | It holds the procedure of this backend. `implementer` gains it. F7 corrects its pointer. |
| `angular-developer` | **The user decides** | 200 KB. Angular v22 moves fast, and the reference on the forms of the signals may hold what the model does not. |
| `tailwind-4-docs` | Delete | 5.1 MB and 242 files, with 8 PNG screenshots. It is the public documentation of Tailwind, and `tailadmin-ui-patterns` holds the classes of this project. |
| `nestjs-best-practices` | Delete | 248 KB of the public guidance of NestJS. `.claude/rules/agent-rules.md` and `docs/architecture/backend/` hold the rules that bind here. |
| `turborepo` | Delete | 164 KB. `docs/architecture/monorepo/` holds the pipeline of this repository. |
| `vitest` | Delete | 140 KB. `frontend-unit-testing` already wins over it, and the file of `tester` forbids it by name. |
| `typescript-advanced-types` | Delete | 20 KB, and its own description says that it does not apply to the ordinary use of the project. |

**Refused: the deletion of all eight unreachable skills.** Two of them hold knowledge that this
repository owns, and no page of `docs/` holds it. The cheaper fix is one `Skill` tool on
`implementer`, with the two names written in its file.

**Refused: the `Skill` tool on `refactorer`.** A refactor keeps the behavior, so it needs the card
of the rules and nothing else.

### D3 — `researcher` splits its audit into a skill

The research of the cycle runs on every feature. The audit runs on request. The file of the agent
keeps the research, and the method and the report of the audit move into a new skill `code-audit`.
`researcher` gains the `Skill` tool, and it loads that skill for job 2 alone.

**Refused: a seventh agent for the audit.** A second agent adds a description to every session, and
the two jobs share the prime directive "read, and never write".

### D4 — `tester` runs when the phase earns it, and not on every phase

`implementer` writes and runs the test of the unit that it builds. `tester` runs when the phase
adds a rule with a scenario that no unit test covers, or when a test is the request itself. The
plan of each feature names the phases that carry a run of `tester`, so the orchestrator decides one
time, in the plan, and not one time per phase.

This removes the paragraph on the border between the two agents, and the order to restate that
border in every prompt.

**Refused: the merge of `tester` into `implementer`.** The guard holds: a test that only passes
after a change of product code is a product bug, and an agent that owns both jobs is free to make
that change.

### D5 — The three agents keep their border

`implementer`, `refactorer` and `tester` each guard one edge of "does this change behavior". The
plan removes no agent.

## 2. The rules that this feature adds

**This feature adds no rule to `docs/business/`.** It changes the configuration of the agents, and
it changes no behavior of `apps/` or of `packages/`. So the last phase writes into
`docs/architecture/agents/`, and it writes nothing into `docs/business/`.

The acceptance criteria replace the scenarios.

| The criterion | How to check it |
|---|---|
| The paragraph of `rtk` exists one time. | `grep -rc "rtk\` is a proxy" CLAUDE.md .claude/` gives one file. |
| No agent file orders a `Read` of a file that loads by itself. | `grep -rn "agent-rules.md" .claude/agents/` gives nothing. |
| Every skill of `.claude/skills/` reaches at least one agent. | Each skill name appears in one agent file, or in `agent-orchestration`. |
| `CLAUDE.md` holds 3,500 bytes at the most. | `wc -c CLAUDE.md`. |
| `agent-orchestration/SKILL.md` holds 6,500 bytes at the most. | `wc -c`. |
| `.claude/skills/` holds 500 KB at the most. | `du -sk .claude/skills`. |
| Every pointer of a file of the layer resolves to a file that exists. | Follow each path of `CLAUDE.md`, of the six agent files and of the five skills. |
| The always-on text of a session drops by 30% at the least. | The table of section 1 of `research.md` gives the number of today. |

## 3. The phases

### Phase 1 — The always-on text and the six agent files

**Agent:** documenter
**Paths:** `CLAUDE.md`, `.claude/rules/agent-rules.md`, `.claude/agents/`

- [ ] 1.1 Confirm whether `.claude/rules/agent-rules.md` loads in the session of a subagent. Launch
      one trivial subagent, and ask it whether it holds the card without a `Read`. Write the answer
      in the report, because task 1.3 depends on it.
- [ ] 1.2 Delete the section "The shell" from the six files of `.claude/agents/`. `CLAUDE.md`
      section 2 keeps the rule, and it is the one owner (F1, D1).
- [ ] 1.3 If task 1.1 confirms that the card loads by itself, delete every pointer to
      `.claude/rules/agent-rules.md` from the six agent files. If it does not, replace the five
      paragraphs with one line each: "Read `.claude/rules/agent-rules.md` first." (F2)
- [ ] 1.4 Trim `CLAUDE.md` to 3,500 bytes at the most. Keep section 1, section 2 and the table of
      section 3. Replace section 4 with three lines: the two folders of the cycle, the two roads of
      a request, and the pointer to `agent-orchestration` (F3, D1).
- [ ] 1.5 Delete from the six agent files every sentence that restates a rule of `CLAUDE.md` or of
      the card: the layers, the aliases, the rule "depend inward only", the ban on ESLint, the ban
      on a dependency, and the five fields of the report. Keep the prime directive of each agent,
      its own procedure, and its own verification.
- [ ] 1.6 Delete from `tester.md` and from `researcher.md` the restatement of the shape of a page
      of the business. Replace each one with one line that points at
      `.claude/skills/project-documentation/SKILL.md` (F4).
- [ ] 1.7 Delete `.claude/RESUME.md`, and add `RESUME.md` to `.claude/.gitignore` (F9).
- [ ] 1.8 Measure `wc -c` on `CLAUDE.md` and on the six agent files, and report the before and the
      after.

### Phase 2 — The skills

**Agent:** documenter
**Paths:** `.claude/skills/`, `.claude/agents/implementer.md`, `.claude/agents/researcher.md`

Phase 1 edits `implementer.md` and `researcher.md`, so this phase starts after phase 1 merges.

- [ ] 2.1 Delete `.claude/skills/tailwind-4-docs/`, `.claude/skills/nestjs-best-practices/`,
      `.claude/skills/turborepo/`, `.claude/skills/vitest/` and
      `.claude/skills/typescript-advanced-types/` (D2).
- [ ] 2.2 Ask the user about `angular-developer` before you touch it. If the user deletes it,
      delete the folder. If the user keeps it, add its name to task 2.3.
- [ ] 2.3 Add `Skill` to the tools of `implementer`, and add one section to its file that names the
      skills that it may load: `backend-feature` for a new feature of the backend, and
      `tailadmin-ui-patterns` for a component of the dashboard. Write the same sentence that the
      other agents carry: a skill that the prompt does not name, and that this file does not name,
      is not yours to load (D2).
- [ ] 2.4 Correct `.claude/skills/backend-feature/SKILL.md`. Replace every pointer to
      `docs/architecture/backend.md` with `docs/architecture/backend/structure.md` and
      `docs/architecture/backend/conventions.md`. Correct step 7, which names a section "Schema
      management" that no page holds. Delete its section "Constraints", because `CLAUDE.md` section
      2 owns those four rules (F7, D1).
- [ ] 2.5 Create `.claude/skills/code-audit/SKILL.md`. Move into it the section "The method of the
      audit" and the section "The report of the audit (job 2)" of `researcher.md` (D3).
- [ ] 2.6 Trim `researcher.md` to the research of the cycle. Add `Skill` to its tools, and add one
      line: for an audit, invoke `code-audit`, and no other skill (D3).
- [ ] 2.7 Verify that each of the five kept skills, plus `code-audit`, plus the skills of task 2.3,
      appears by name in one agent file or in `agent-orchestration`. Report any skill that reaches
      no agent.
- [ ] 2.8 Report `du -sk .claude/skills` before and after.

### Phase 3 — The orchestration skill and the workflow

**Agent:** documenter
**Paths:** `.claude/skills/agent-orchestration/SKILL.md`

- [ ] 3.1 Trim the skill to 6,500 bytes at the most. Delete the sentences that give the reason of a
      rule, because `docs/architecture/agents/key-flows.md` owns the reason. Keep the rule.
- [ ] 3.2 Rewrite step 4 for the conditional run of `tester`. The plan of a feature names the
      phases that carry a run of `tester`; a phase that carries none goes from the last code task
      straight to `git-manager` (D4).
- [ ] 3.3 Delete from section 4 the paragraph "The border between `implementer` and `tester`", and
      the order to restate that border in every prompt. Replace it with two lines: `implementer`
      writes the test of the unit that it builds; `tester` writes the test of the scenario of the
      business (D4).
- [ ] 3.4 Delete from section 2 the restatement of the shape of `plan.md`, and point at
      `project-documentation`, which owns it. Keep the three parts of the plan as a list of three
      names (F3, D1).
- [ ] 3.5 Add one line to section 3 of the plan template: name the phases that carry a run of
      `tester`.
- [ ] 3.6 Report `wc -c` before and after.

### Phase 4 — The documentation and the close

**Agent:** documenter
**Paths:** `docs/architecture/agents/`, `docs/roadmap.md`, `docs/roadmap/agent-layer/`
**This is the last phase.**

- [ ] 4.1 Correct `docs/architecture/agents/key-flows.md`. The diagram must show the conditional
      run of `tester`. The section "The choice of the agent" must state the six agents and the
      skill that each one may load.
- [ ] 4.2 Add to `docs/architecture/agents/conventions.md`, or create it, the rule of one owner for
      one rule, with the table of D1. This is the rule that stops the layer from growing copies
      again.
- [ ] 4.3 Check every one of the eight acceptance criteria of section 2, and report the result of
      each one with its command.
- [ ] 4.4 Delete `docs/roadmap/agent-layer/`, and remove its line from `docs/roadmap.md`.

## 4. What the plan expects to save

| The moment | Today | After | The drop |
|---|---|---|---|
| A session of the orchestrator | 17,795 B | about 12,100 B | 32% |
| The cold start of `documenter` | 32,654 B | about 21,800 B | 33% |
| The cold start of `git-manager` | 21,011 B | about 15,000 B | 29% |
| The cold start of `researcher`, for the research | 24,395 B | about 13,500 B | 45% |
| `.claude/skills/` on the disk | 6.1 MB | about 0.3 MB | 95% |

The plan also removes five `Read` calls of 4,642 bytes, one for each subagent that opened the card
that it already held, and one cold start of `tester` on each phase that adds no scenario.
