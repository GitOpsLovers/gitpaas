# How to group the tasks of a phase

- **Group by agent type and by file area, and send one call per group.** A subagent starts cold: it loads `CLAUDE.md`, it loads its own file, and it reads the folder of the roadmap again. Ten calls pay that price ten times. A phase of ten tasks makes two or three calls.
- **Split a group for a real reason alone.** Two groups touch the same file, or the second group needs the report of the first. Two groups that touch different areas run in parallel, in one message.
- **`implementer` writes the code and its tests in one call.** A task that names a test joins the group of the code that it covers, whatever the phase that holds it. Do not send a second call for the tests of a change that one call already made.
- **When a request spans more than one type, split it, and order the parts.** Usually `implementer`, then `documenter`. Read each report before you launch the next part.
