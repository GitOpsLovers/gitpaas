# When a subagent reports a block

A subagent stops and reports. It does not guess. Read the report, and take one of these four roads.
**Never send the same prompt again.** A cold start with the same text gives the same block, and it
costs the same tokens.

| The report says | You do |
|---|---|
| A task is unclear, or it holds two readings | Ask the user the one question. Then delegate again, with the answer inside the prompt. |
| A task needs a decision about the architecture | Ask the user. If the decision changes the plan, correct `plan.md` before you delegate again. |
| The plan and the code disagree | Stop the phase. Correct `plan.md`, and say what changed. |
| A package is missing | Name the package to the user, and wait. No agent installs a dependency. |

A task that stays open keeps an empty box in `plan.md`. Deliver every other task of the phase, and
name the open box to the user. Never mark a box that a subagent did not close.
