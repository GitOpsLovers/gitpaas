# The workflow of the day

The user writes a sentence, and the orchestrator delegates to one or more subagents. The change stays in the working tree. **This workflow invokes no `git-manager`, and it opens no Pull Request.** The orchestrator names the files that it changed, and the user commits.

The workflow of the day takes a question, a small fix, a test, a refactor that keeps the behavior, a document, a configuration and an audit. It never touches Git.

## Run the workflow

1. Read the request, and pick the subagent that it needs. [which-agent.md](which-agent.md) gives the table of the choice.
2. Group the tasks, and decide how many calls they take. [grouping.md](grouping.md) gives the rules of the grouping.
3. Write the prompt of each delegation. [prompt.md](prompt.md) gives the template.
4. Read every report, and relay the result to the user. Name every file that the subagent changed.

[limits.md](limits.md) states when the orchestrator may edit a file itself, instead of delegating.
[blocked.md](blocked.md) states the next move when a subagent reports a block.
