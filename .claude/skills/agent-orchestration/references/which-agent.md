## 3. Which agent takes the work

The description of each subagent states its own triggers, and those descriptions load with this
file. So pick by the type of the task, and read the description when the choice is close.

| The task | The agent |
|---|---|
| A feature, a bug fix, a new endpoint or component; any change of behavior | `implementer` |
| A restructure that keeps the behavior | `refactorer` |
| A test, when a test is the request itself | `tester` |
| A document, a page of `docs/`, a doc-comment | `documenter` |
| The research of the cycle, an audit, a report. It reads, and it never writes code | `researcher` |
| A branch, a commit, a push, a Pull Request | `git-manager` |
| The plan of the cycle | Nobody. The orchestrator writes it. |
