# Improve the multi-agent system

This page lists the work to make the agent system cheaper in tokens, and more exact. Each task
names the problem, the action and the gain.

The review covered `CLAUDE.md`, the six files of `.claude/agents/`, the six commands of
`.claude/commands/opsx/`, the eleven skills of `.claude/skills/`, `.claude/settings.json`,
`openspec/config.yaml` and the change folders of `openspec/changes/`.

## Sections

- [A. Correct the defects](#a-correct-the-defects)
- [B. Cut the cost of a cold start](#b-cut-the-cost-of-a-cold-start)
- [C. Cut the cost of the OpenSpec cycle](#c-cut-the-cost-of-the-openspec-cycle)
- [D. Make the delegation exact](#d-make-the-delegation-exact)
- [E. Cut the cost of the work of an agent](#e-cut-the-cost-of-the-work-of-an-agent)
- [F. Measure the result](#f-measure-the-result)

---

## A. Correct the defects

These are errors. They make an agent read the wrong file, or read no file.

- [x] **A1. Correct the reading table of `CLAUDE.md`.** The table tells a subagent to read section 4.
      Section 4 holds the rules of the orchestrator, and a subagent never delegates. Change the cell
      to "Section 1, section 5 and section 6".
- [x] **A2. Correct the name of the testing skill in `tester.md`.** Line 30 names `backend-testing`.
      That skill does not exist. The two real skills are `backend-unit-testing` and
      `frontend-unit-testing`.
- [x] **A3. Give the path of the skill to `tester`.** A subagent has no `Skill` tool, so it must open
      the file with `Read`. Write the two paths: `.claude/skills/backend-unit-testing/SKILL.md` and
      `.claude/skills/frontend-unit-testing/SKILL.md`. The file `git-manager.md` already states this
      rule, and `tester.md` does not.
- [x] **A4. Give one name to the test runner of the frontend.** The file `tester.md` says Vitest. The
      file `implementer.md` says "Jest/Vitest". Read `apps/frontend/package.json`, and write the one
      correct name in both files.
- [x] **A5. Remove the stale checkpoint `.claude/RESUME.md`.** It points to a session of the 21st of
      August 2026, and it holds no current value.

## B. Cut the cost of a cold start

Every subagent loads `CLAUDE.md` (13 kB) plus its own file. A change of ten tasks pays this price
three or four times.

- [x] **B1. Move sections 2, 3 and 4 of `CLAUDE.md` out of `CLAUDE.md`.** These three sections hold
      the workflow and the rules of the orchestrator, and no subagent uses them. Put them in
      `.claude/skills/agent-orchestration/SKILL.md`, and let the orchestrator load that skill. Keep
      in `CLAUDE.md` the stack, the rules of every agent, and the map of the documents. This removes
      about 7 kB from every subagent call.
- [x] **B2. Write one card of the architecture rules.** Four agent files repeat the same paragraph:
      the four pages to read, the two lists of path aliases, and the rule "depend inward only".
      Create `docs/agent-rules.md` with the layers, the aliases and that rule, in under 60 lines.
      Then each agent reads one short page, and not four pages of about 350 lines. **The card holds
      76 lines.**
- [x] **B3. Point every agent file at that card.** Replace the repeated paragraph in
      `implementer.md`, `refactorer.md`, `tester.md`, `documenter.md` and `architecture-analyst.md`
      with one line that names `docs/agent-rules.md`.
- [x] **B4. Shorten the `description` of each agent.** The description of `architecture-analyst` holds
      about 800 characters, and the six descriptions load in every session. Keep the trigger list and
      the "Do NOT use for" line, and remove the prose. Target 400 characters each.
- [x] **B5. Review the model of each agent.** `git-manager` uses Haiku, and `refactorer`, `tester` and
      `documenter` use Sonnet. Confirm that `implementer` and `architecture-analyst` need
      `inherit`, and set an explicit model if they do not. **Decision: the two agents keep `inherit`.**
      `implementer` writes product code, and `architecture-analyst` judges the structure of two
      applications. Both need the model of the orchestrator. The other four keep Sonnet and Haiku.

## C. Cut the cost of the OpenSpec cycle

- [x] **C1. Stop the call to `/opsx:apply`.** The command file holds 8 kB, and section 4 of
      `CLAUDE.md` then cancels its main instruction: in this project it must not implement. The
      orchestrator reads `openspec/changes/<change-id>/tasks.md` directly, and it delegates. Delete
      the mention of `/opsx:apply` from step 4, and write the direct rule instead.
- [x] **C2. Fill the `context` block of `openspec/config.yaml`.** The file holds comments alone today.
      Write the stack, the layers, the `rtk` prefix, and the rule of one phase for one Pull Request.
      Every `opsx` command then receives this context from the CLI, and the orchestrator repeats
      less of it in each prompt.
- [x] **C3. Add the rules of the artifact `tasks` to `openspec/config.yaml`.** Ask `/opsx:propose` for
      three things:
      1. One numbered section for one phase, and one phase for one Pull Request.
      2. A line at the head of each section that names the agent: `implementer`, `refactorer`,
         `tester` or `documenter`.
      3. A line that names the paths that the section touches.
      The orchestrator then delegates with no regrouping, and it reads no code to build the prompt.
- [x] **C4. Mark the phase in `tasks.md`.** The current file `openspec/changes/log-retention/tasks.md`
      shows six numbered sections and no phase. The commits name the phase, and the file does not.
      Write the phase number in the title of the section. **Applied to the four active changes.**
- [x] **C5. State the last phase in `tasks.md`.** `/opsx:sync` runs one time, before the commit of the
      last phase. Today the orchestrator must count the sections to find that moment. A mark in the
      file removes the count.
- [x] **C6. Record the decision about the local copy of a command.** `CLAUDE.md` forbids a local copy
      of an `opsx` command. The commands carry a long block about a "store", and this project uses
      no store. Confirm the rule, or write the exception, so no agent reopens the question.
      **Decision: section 3 of `CLAUDE.md` holds the three closed decisions.** No local copy of a
      command; no call to `/opsx:apply`; no `--store` flag, because `openspec store list` gives an
      empty list.

## D. Make the delegation exact

- [ ] **D1. Write the template of the prompt of a delegation.** Section 4 of `CLAUDE.md` gives the
      four parts of a prompt: the goal, the scope, the paths and the acceptance criteria. Add the
      template itself, so every call has the same shape.
- [ ] **D2. Give a budget to the report of a subagent.** The report is the only thing that returns to
      the orchestrator. Set the limit at 200 words, and give the five fields: what changed, the paths,
      the result of the checks, the tasks that stay open, and the follow-ups.
- [ ] **D3. Separate the test work of `implementer` from the work of `tester`.** Step 6 runs `tester`
      one time for the phase, and `implementer` already writes the tests of its own section. Write
      which cases belong to each, so the two agents write no test two times.
- [ ] **D4. Add the rule of the failed delegation.** Today no rule says what the orchestrator does
      when a subagent reports a block. Write it: read the report, and delegate the remainder; never
      repeat the same prompt.

## E. Cut the cost of the work of an agent

- [ ] **E1. Add a rule about how to read a file.** An agent reads a whole file too often. Write the
      rule: find the line with `Grep -n`, then read that range with `Read` and its parameters
      `offset` and `limit`. Read a whole file only if it holds under 100 lines.
- [ ] **E2. Add a hook that checks the `rtk` prefix.** A `PreToolUse` hook on `Bash` refuses a command
      with no prefix. The agent then loses no turn on the correction. Use the skill `update-config`
      to write it in `.claude/settings.json`.
- [ ] **E3. Reduce the prompts for a permission.** Run the skill `fewer-permission-prompts`, and merge
      the result of `.claude/settings.local.json` into `.claude/settings.json`. Each prompt costs a
      turn.
- [ ] **E4. Give `architecture-analyst` a scope by default.** The agent reads two applications when
      the prompt names no scope. Ask for one application, or for one feature, in every call.
- [ ] **E5. State the limit of `documenter` on the four index pages.** The file already holds the rule.
      Move it into the skill `project-documentation`, so one file holds it.

## F. Measure the result

- [ ] **F1. Count the tokens of a cold start, before and after section B.** Add the sizes of
      `CLAUDE.md`, of the agent file, and of the pages that the agent reads. Write the two numbers
      in this page.
- [ ] **F2. Run one change of about ten tasks after the corrections.** Count the calls to a subagent,
      and count the phases. The target stays three or four calls for a change of ten tasks.
