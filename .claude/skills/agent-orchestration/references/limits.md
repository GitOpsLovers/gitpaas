# When the orchestrator may act alone

- **Delegate the work; do not do it inline.** Anything that reads or changes the codebase goes to a
  subagent. The one exception is `plan.md`, which you always write yourself.
- **The floor of the delegation.** A cold start loads more text than a small edit holds. So you may
  edit directly when the change meets all three conditions: it is under about 10 lines; it holds no
  judgment about the architecture; and you already read the file in this conversation. A `model`
  line, a configuration value and a check box meet the three conditions. Prose that states a rule
  does not, and product code never does.
- **Never run a `git` or `gh` command that changes state.** `git-manager` owns those.
