# The plan of the optimization of the layer of the agents

Every decision of this plan is final. The user answered the four open points of `research.md`,
section 4, and section 1 records each answer.

## 1. The decisions

### D1 — One file holds the rules of the layer, and `.claude/rules/agent-rules.md` goes away

**The user decided the merge.** Two files that describe one subject scatter that subject. The card
`.claude/rules/agent-rules.md` moves into `CLAUDE.md`, and the card file is deleted. Each rule then
gets one owner.

| The rule | Its owner | Every other file |
|---|---|---|
| The prefix `rtk`, the ESLint, the dependencies, the tests | `CLAUDE.md` | States nothing |
| The layers, the one rule of the dependencies, the aliases | `CLAUDE.md` | States nothing |
| The routing, the cycle, the grouping, the prompt | `.claude/skills/agent-orchestration/SKILL.md` | Points at it |
| The map of `docs/`, the shape of a page and of a file of the roadmap | `.claude/skills/project-documentation/SKILL.md` | Points at it |
| The branch, the commit, the Pull Request | `.claude/skills/git-github-workflow/SKILL.md` | Points at it |
| The reason of each rule of the layer | `docs/architecture/agents/` | Points at it |

**The cost, stated in the open.** `CLAUDE.md` loads whole in every session and in every cold start
of a subagent. The card holds 4,642 bytes today. So the merged file grows, and the target of 3,500
bytes falls. The plan sets the new target at 9,000 bytes, and it reaches that number by deleting
the copies, not by deleting a rule. Section 4 gives the savings that remain after the merge.

### D2 — The layer keeps eight skills, it adds one, and it deletes five

The layer keeps a skill that holds knowledge of this project or of a framework that moves fast. It
deletes a skill that holds a vendored copy of a public documentation that the model already knows.

| The skill | The decision | The reason |
|---|---|---|
| `agent-orchestration` | Keep | The orchestrator invokes it. |
| `project-documentation` | Keep | `documenter` invokes it. |
| `git-github-workflow` | Keep | `git-manager` invokes it. |
| `backend-unit-testing` | Keep | `tester` invokes it. Its references hold the conventions of this repository. |
| `frontend-unit-testing` | Keep | `tester` invokes it. Same reason. |
| `tailadmin-ui-patterns` | Keep, and wire it | 20 KB, and it holds the classes of this frontend. `implementer` gains the `Skill` tool. |
| `backend-feature` | Keep, wire it, and correct it | It holds the procedure of this backend. `implementer` gains it. Task 2.4 corrects its pointer (F7). |
| `angular-developer` | **Keep, and wire it** | The frontend is Angular. Angular v22 moves fast, and the reference on the forms of the signals holds 905 lines that the model may not hold. `implementer` gains it. |
| `code-audit` | Create | D3 moves the audit of `researcher` into it. |
| `tailwind-4-docs` | Delete | 5.1 MB and 242 files, with 8 PNG screenshots. It is the public documentation of Tailwind, and `tailadmin-ui-patterns` holds the classes of this project. |
| `nestjs-best-practices` | Delete | 248 KB of the public guidance of NestJS. `CLAUDE.md` and `docs/architecture/backend/` hold the rules that bind here. |
| `turborepo` | Delete | 164 KB. `docs/architecture/monorepo/` holds the pipeline of this repository. |
| `vitest` | Delete | 140 KB. `frontend-unit-testing` already wins over it, and the file of `tester` forbids it by name. |
| `typescript-advanced-types` | Delete | 20 KB, and its own description says that it does not apply to the ordinary use of the project. |

**Refused: the deletion of every unreachable skill.** Three of them hold knowledge that this
repository needs, and no page of `docs/` holds it. The cheaper fix is one `Skill` tool on
`implementer`, with the three names written in its file.

**Refused: the `Skill` tool on `refactorer`.** A refactor keeps the behavior, so it needs the rules
of `CLAUDE.md` and nothing else.

### D3 — `researcher` splits its audit into a skill, and it runs on Sonnet 5

The research of the cycle runs on every feature. The audit runs on request. The file of the agent
keeps the research, and the method and the report of the audit move into a new skill `code-audit`.
`researcher` gains the `Skill` tool, and it loads that skill for job 2 alone.

**The user set the model to Sonnet 5.** The frontmatter changes from `model: inherit` to
`model: sonnet`. The agent reads and it reports, and it writes no code.

**Refused: a seventh agent for the audit.** A second agent adds a description to every session, and
the two jobs share the prime directive "read, and never write".

### D4 — `tester` owns the whole test layer, and `implementer` writes no test

**The user decided this border.** If a phase changes a file of `apps/` or of `packages/`, that
phase carries a run of `tester`. `implementer` writes no spec file, and it adds no test case. It
runs the existing suite of the affected app to verify that its change breaks nothing, and it
reports the result.

This replaces the earlier proposal of a conditional run. It also removes the paragraph on the
border between the two agents, and the order to restate that border in every prompt, because the
border is now one sentence: `tester` writes every test, and `implementer` writes none.

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
| The paragraph of `rtk` exists one time. | `rtk grep -rl "rtk\` is a proxy" CLAUDE.md .claude` gives `CLAUDE.md` alone. |
| The card no longer exists, and no file names it. | `rtk grep -rn "agent-rules" CLAUDE.md .claude docs` gives nothing. |
| Every skill of `.claude/skills/` reaches at least one agent. | Each skill name appears in one agent file, or in `agent-orchestration`. |
| `CLAUDE.md` holds 9,000 bytes at the most, and it holds the layers, the one rule and the aliases. | `rtk wc -c CLAUDE.md`, and a read of its sections. |
| `agent-orchestration/SKILL.md` holds 6,500 bytes at the most. | `rtk wc -c`. |
| `.claude/skills/` holds 600 KB at the most. | `rtk du -sk .claude/skills`. |
| Every pointer of a file of the layer resolves to a file that exists. | Follow each path of `CLAUDE.md`, of the six agent files and of the nine skills. |
| The always-on text of a session drops by 20% at the least. | The table of section 1 of `research.md` gives the number of today. |
| No agent file states that `implementer` writes a test. | `rtk grep -rn "test" .claude/agents/implementer.md` gives the run of the suite alone. |

## 3. The phases

### Phase 1 — The merge of the rules and the six agent files

**Agent:** documenter
**Paths:** `CLAUDE.md`, `.claude/rules/`, `.claude/agents/`

- [ ] 1.1 Merge `.claude/rules/agent-rules.md` into `CLAUDE.md`. Add its five sections — the one
      rule, the layers of the backend, the layers of the frontend, the path aliases and the tests —
      as a new section of `CLAUDE.md`. Delete the sentences of the card that repeat a rule that
      `CLAUDE.md` already states (D1).
- [ ] 1.2 Delete `.claude/rules/agent-rules.md`, and delete `.claude/rules/` if it holds no other
      file.
- [ ] 1.3 Delete every pointer to `.claude/rules/agent-rules.md`. Seven files hold one: the six
      files of `.claude/agents/` and `.claude/skills/project-documentation/SKILL.md`. Correct the
      line of the table of `CLAUDE.md` that names the card (F2, D1).
- [ ] 1.4 Correct the two roadmap folders that name the card: `docs/roadmap/complexity-reduction/`
      holds three references, in `TODO.md`, in `research-backend.md` and in `research-frontend.md`.
      Point each one at `CLAUDE.md`.
- [ ] 1.5 Delete the section "The shell" from the six files of `.claude/agents/`. `CLAUDE.md` keeps
      the rule, and it is the one owner (F1, D1).
- [ ] 1.6 Trim `CLAUDE.md` to 9,000 bytes at the most, with the merged rules inside it. Keep the
      stack, the rules of every agent, the merged rules of the architecture and the table of the
      pointers. Replace the section of the specification-driven development with three lines: the
      two folders of the cycle, the two roads of a request, and the pointer to
      `agent-orchestration` (F3, D1).
- [ ] 1.7 Delete from the six agent files every sentence that restates a rule of `CLAUDE.md`: the
      layers, the aliases, the rule "depend inward only", the ban on ESLint, the ban on a
      dependency, and the five fields of the report. Keep the prime directive of each agent, its
      own procedure, and its own verification.
- [ ] 1.8 Delete from `tester.md` and from `researcher.md` the restatement of the shape of a page
      of the business. Replace each one with one line that points at
      `.claude/skills/project-documentation/SKILL.md` (F4).
- [ ] 1.9 Delete `.claude/RESUME.md`, and add `RESUME.md` to `.claude/.gitignore` (F9).
- [ ] 1.10 Measure `rtk wc -c` on `CLAUDE.md`, on the card and on the six agent files, and report
      the before and the after.

### Phase 2 — The skills

**Agent:** documenter
**Paths:** `.claude/skills/`, `.claude/agents/implementer.md`, `.claude/agents/researcher.md`

Phase 1 edits `implementer.md` and `researcher.md`, so this phase starts after phase 1 merges.

- [ ] 2.1 Delete `.claude/skills/tailwind-4-docs/`, `.claude/skills/nestjs-best-practices/`,
      `.claude/skills/turborepo/`, `.claude/skills/vitest/` and
      `.claude/skills/typescript-advanced-types/` (D2).
- [ ] 2.2 Keep `.claude/skills/angular-developer/`. The user decided that it stays, because the
      frontend is Angular and the skill holds the current API of the forms of the signals (D2).
- [ ] 2.3 Add `Skill` to the tools of `implementer`, and add one section to its file that names the
      three skills that it may load: `backend-feature` for a new feature of the backend,
      `tailadmin-ui-patterns` for a component of the dashboard, and `angular-developer` for the
      signals, the forms, the routing and the reactivity of Angular. Write the same sentence that
      the other agents carry: a skill that the prompt does not name, and that this file does not
      name, is not yours to load (D2).
- [ ] 2.4 Correct `.claude/skills/backend-feature/SKILL.md`. Replace every pointer to
      `docs/architecture/backend.md` with `docs/architecture/backend/structure.md` and
      `docs/architecture/backend/conventions.md`. Correct step 7, which names a section "Schema
      management" that no page holds. Delete its section "Constraints", because `CLAUDE.md` owns
      those four rules (F7, D1).
- [ ] 2.5 Create `.claude/skills/code-audit/SKILL.md`. Move into it the section "The method of the
      audit" and the section "The report of the audit (job 2)" of `researcher.md` (D3).
- [ ] 2.6 Trim `researcher.md` to the research of the cycle. Add `Skill` to its tools, set
      `model: sonnet` in its frontmatter, and add one line: for an audit, invoke `code-audit`, and
      no other skill (D3).
- [ ] 2.7 Verify that each of the nine skills appears by name in one agent file or in
      `agent-orchestration`. Report any skill that reaches no agent.
- [ ] 2.8 Report `rtk du -sk .claude/skills` before and after.

### Phase 3 — The orchestration skill and the workflow

**Agent:** documenter
**Paths:** `.claude/skills/agent-orchestration/SKILL.md`, `.claude/agents/implementer.md`,
`.claude/agents/tester.md`

- [ ] 3.1 Trim the skill to 6,500 bytes at the most. Delete the sentences that give the reason of a
      rule, because `docs/architecture/agents/key-flows.md` owns the reason. Keep the rule.
- [ ] 3.2 Rewrite step 4 for the rule of D4. If a phase changes a file of `apps/` or of
      `packages/`, that phase carries a run of `tester` after the run of `implementer`. A phase
      that changes no such file carries none.
- [ ] 3.3 Delete from section 4 the paragraph "The border between `implementer` and `tester`", and
      the order to restate that border in every prompt. Replace it with one line: `tester` writes
      every test of `apps/` and of `packages/`, and `implementer` writes none (D4).
- [ ] 3.4 Correct `.claude/agents/implementer.md`. Delete every order to write a test or a spec
      file. Keep one line of verification: run the suite of the affected app with the command of
      `package.json`, and report the real result (D4).
- [ ] 3.5 Correct `.claude/agents/tester.md`. State that this agent owns the whole test layer of
      `apps/` and of `packages/`: the test of the unit and the test of the scenario of the business
      (D4).
- [ ] 3.6 Delete from section 2 the restatement of the shape of `plan.md`, and point at
      `project-documentation`, which owns it. Keep the three parts of the plan as a list of three
      names (F3, D1).
- [ ] 3.7 Report `rtk wc -c` before and after.

### Phase 4 — The documentation and the close

**Agent:** documenter
**Paths:** `docs/architecture/agents/`, `docs/roadmap.md`, `docs/roadmap/agent-layer/`
**This is the last phase.**

- [ ] 4.1 Correct `docs/architecture/agents/key-flows.md`. The diagram must show the run of
      `tester` on every phase that changes `apps/` or `packages/`. The section "The choice of the
      agent" must state the six agents and the skill that each one may load.
- [ ] 4.2 Create `docs/architecture/agents/conventions.md`. Write in it the rule of one owner for
      one rule, with the table of D1, and the reason why the layer holds one file of rules and not
      two. This is the rule that stops the layer from growing copies again.
- [ ] 4.3 Check every one of the nine acceptance criteria of section 2, and report the result of
      each one with its command.
- [ ] 4.4 Delete `docs/roadmap/agent-layer/`, and remove its line from `docs/roadmap.md`.

## 4. What the plan expects to save

The merge of D1 moves 4,642 bytes into the file that every agent loads, so the savings are smaller
than the first draft of this plan claimed. These numbers hold the merge.

| The moment | Today | After | The drop |
|---|---|---|---|
| A session of the orchestrator | 17,795 B | about 13,400 B | 25% |
| The cold start of `documenter` | 32,654 B | about 27,600 B | 15% |
| The cold start of `git-manager` | 21,011 B | about 17,700 B | 16% |
| The cold start of `researcher`, for the research | 24,395 B | about 17,900 B | 27% |
| `.claude/skills/` on the disk | 6.1 MB | about 0.55 MB | 91% |

The plan also removes five `Read` calls of 4,642 bytes, one for each subagent that opened the card
that it already held.

`researcher` gains a second saving that these bytes do not show: the frontmatter `model: sonnet`
lowers the price of every research of the cycle (D3).
