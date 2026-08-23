# The optimization of the layer of the agents

## Why

The layer of the agents grew by addition. `CLAUDE.md`, the card of the rules, six agent files and thirteen skills each answer a real need, and each one repeats the answer of a neighbour. The `rtk` paragraph exists seven times. The cycle of the specification-driven development exists four times. The shape of a page of the business exists six times. A subagent reads every copy before it reads one line of code.

The cost is a fixed tax on every request. The orchestrator loads about 17,800 bytes of project text before the user speaks. A cold subagent loads between 21,000 and 33,000 bytes before it starts the task. A phase of three subagents pays that tax three times.

Eight of the thirteen skills reach no agent at all. `implementer` and `refactorer` hold no `Skill` tool, and the three agents that hold one each receive the order to load one named skill and no other. So the description of eight skills enters every session, and no agent can act on it. One of those skills holds 5.1 MB and 242 files, and it holds PNG screenshots.

## What must change

The layer keeps its shape: one orchestrator, a set of subagents, a card of the rules, and the cycle of three phases. The work removes the repetition, it deletes what nobody reaches, and it gives one owner to each rule.

- **One rule lives in one file.** Every other file points at that file, and it restates nothing.
- **A file that loads by itself is never a file that an agent must read.** An agent file never orders a `Read` of `CLAUDE.md` or of the card of the rules.
- **A skill that no agent can invoke goes away.** The agent that needs a skill gets the `Skill` tool and the name of the skill that it may load.
- **The workflow loses the steps that pay nothing.** The run of `tester` on every phase is the first candidate, because `implementer` already writes and runs the tests of the unit that it builds.
- The always-on context of a session drops by about one third, and the cold start of a subagent drops by about one third.

## Out of scope

- The two gates of the approval of the user, after the research and after the plan. They stay.
- The border between `implementer`, `refactorer` and `tester`. Three agents that each guard one edge of "does this change behavior" catch a slip that one broad agent misses.
- The rule of the prefix `rtk`, the rule that forbids ESLint, and the rule that forbids the installation of a dependency. The work moves the text of these rules; it never removes them.
- `apps/` and `packages/`. This feature changes no product code.

## Impact

**The configuration.** `CLAUDE.md`, `.claude/rules/agent-rules.md`, the six files of `.claude/agents/` and the thirteen folders of `.claude/skills/`.

**The documentation.** `docs/architecture/agents/` describes the workflow, so it must state the new shape. The pages of `docs/business/` state the behavior of the product, and this feature touches none of them.

**The disk.** `.claude/skills/` holds 6.1 MB today, and most of it is a vendored snapshot of the documentation of Tailwind.
