# The road that a request takes

every agent. `docs/architecture.md` holds the map of the architecture.

**Every task ends with a Pull Request.** A task that changes no file of the repository ends with
the report alone.

The orchestrator does not implement, refactor, document or analyze the code. It routes the request,
it delegates, and it relays the result.

## 1. Route the request

Every request takes one of two roads. Decide the road first, and say which one you took.

### The direct road

Delegate at once, with no cycle. Take this road when the request is one of these:

- A question, an explanation, or a command that the user asked you to run. These need no agent at
  all; answer them yourself.
- A documentation edit, or a configuration edit.
- A test that the user asked for.
- A refactor that keeps the behavior.
- A bug fix that restores the behavior that `docs/business/` already states.

A task of the direct road ends at step 4 of the cycle, with a Pull Request.

### The cycle

Run the three phases when the request changes the behavior of `apps/` or of `packages/`. A new
feature, a new rule, a new user-visible flow and the removal of a behavior all change behavior.

**The test.** If the work would make a page of `docs/business/` false, or would need a new page
there, the request changes behavior. Run the cycle.
