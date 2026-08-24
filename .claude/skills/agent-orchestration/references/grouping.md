# How to group the tasks of a phase

- **Group by agent type and by file area, and send one call per group.** A subagent starts cold: it
  loads `CLAUDE.md`, it loads its own file, and it reads the folder of the roadmap again. Ten calls
  pay that price ten times. A phase of ten tasks makes two or three calls.
- **Split a group for a real reason alone.** Two groups touch the same file, or the second group
  needs the report of the first. Two groups that touch different areas run in parallel, in one
  message.
- **`tester` writes every test of `apps/` and of `packages/`, and `implementer` writes none.** A
  task that names a test goes to `tester`, whatever the phase that holds it. `implementer` runs the
  existing suite to verify its change, and it reports the count.
- **When a request spans more than one type, split it, and order the parts.** Usually
  `implementer`, then `tester`, then `documenter`. Read each report before you launch the next part.
