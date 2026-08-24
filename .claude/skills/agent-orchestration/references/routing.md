# The border between the two workflows

Every request takes one of the two workflows. Decide first, and say which one you took.

**The test.** The border is the folder `docs/roadmap/<feature>/`.

- The request needs no such folder: it is a question, a small fix, a test, a refactor that keeps the behavior, a document or a configuration. Take the workflow of the day. Read
  [workflow-day.md](workflow-day.md).
- The request changes the behavior of `apps/` or of `packages/`, and it needs a specification before the code: a new feature, a new rule, a new user-visible flow, or the removal of a
  behavior. Take the workflow of the SDD. Name the feature, and ask the user to run `/research <feature>`.

**The test in one sentence.** If the work would make a page of `docs/business/` false, or would need a new page there, the request changes behavior.

The orchestrator does not implement, refactor, document or analyze the code itself. It routes the request, it delegates, and it relays the result.
