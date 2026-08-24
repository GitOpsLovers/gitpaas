# Key flows

The layer holds two named workflows, and never a third shape of the cycle. The workflow of the day is a conversation, and the workflow of the SDD is three commands. Each one carries its own reason for the way it delivers the change; `.claude/skills/agent-orchestration/references/routing.md` gives the test that chooses one workflow over the other for a given request.

## The workflow of the day

The user writes a sentence that names no folder of `docs/roadmap/`, and the orchestrator delegates to one or more subagents. The change stays in the working tree.

```mermaid
flowchart TD
    A[User writes a sentence] --> B[Orchestrator picks the subagent]
    B --> C[Group the tasks, decide the calls]
    C --> D[Write the prompt of each delegation]
    D --> E[Delegate to one or more subagents]
    E --> F[Read every report]
    F --> G[Relay the result, name every file changed]
```

**The reason of this delivery.** This workflow takes a question, a small fix, a test, a refactor that keeps the behavior, a document, a configuration and an audit — work with no specification to gate it. It invokes no `git-manager`, and it opens no Pull Request, because the user reviews and commits the change of a conversation directly; a Pull Request for every sentence would put a review step in front of work that carries no risk large enough to need one. `.claude/skills/agent-orchestration/references/workflow-day.md` gives the four steps in full, and `references/limits.md` states when the orchestrator may edit a file itself instead of delegating.

## The workflow of the SDD

The user runs `/research`, `/plan` and `/implement` in order, one command for one step, and each command is the gate: it runs, and it stops, so the user approves by typing the next command.

```mermaid
flowchart TD
    A["/research: user names a feature"] --> B[researcher reads the code and docs/business/, writes no file]
    B --> C[Command relays: today's state, options, open questions]
    C --> D[User answers the questions, in the conversation]
    D --> E["/plan: orchestrator writes docs/roadmap/feature/TODO.md"]
    E --> F[Command shows the phases, stops]
    F --> G["/implement: takes the first phase with an open box"]
    G --> H[Delegate the tasks of the phase]
    H --> I[tester runs once, for the phase]
    I --> J[git-manager opens the Pull Request of the phase]
    J --> K{More phases left?}
    K -->|Yes, user runs /implement again| G
    K -->|No, last phase| L[documenter writes docs/business/, deletes the roadmap folder]
```

**The reason of this delivery.** `git-manager` runs one time inside `/implement` alone, and nowhere else in the layer, because only `/implement` produces code that changed the behavior of `apps/` or of `packages/` under a specification the user already approved in `TODO.md`. A phase is the unit of that delivery: it groups its own tasks, its own run of `tester`, and its own Pull Request, so a reviewer judges one phase and not the whole feature, and the user can stop after a phase that reveals a wrong plan, before the next phase builds on it. `docs/roadmap/<feature>/TODO.md` is the whole state of the work between two commands, so a new conversation can pick up `/plan` or `/implement` from that one file alone. `.claude/skills/agent-orchestration/references/workflow-sdd.md` gives the three commands in full.

## The choice of the agent

Six subagents exist, and not one, because a single agent that reads, writes, tests, refactors and documents would carry the tools and the caution of all five jobs on every task, even the small one. A subagent that loads only its own job stays cheaper to start, and its prompt states one prime directive, so its output is easier to judge against that one directive.

The border between `implementer`, `refactorer` and `tester` protects the same thing from three sides: the behavior of the application.

- `implementer` changes behavior on purpose. It builds a feature, wires an endpoint, or fixes a bug, and it writes the test of the unit that it builds.
- `refactorer` restructures code and keeps the behavior identical. It has no license to add a feature or to fix a bug that it notices; it reports that finding instead.
- `tester` writes or repairs a test and changes no product code. When a test only passes after a change of product code, that is a product bug, and `tester` reports it rather than fixing it.

Three agents that each guard one edge of "does this change behavior" catch a slip that one broad agent would miss: a refactor that quietly fixes a bug, or a test that quietly changes the code under test. The choice of the agent for each kind of task is in `.claude/skills/agent-orchestration/references/which-agent.md`.

`researcher` carries two jobs, and both read the code and write no code. The first job is the research of the cycle: it reports what the system does today, so the tasks start from a fact, and not from a guess. That report stays in the conversation and reaches no file, because the orchestrator needs it one time alone, and a file of research costs every later agent the tokens to read it. The second job is the audit: a report on the structure of the code, on request, with no feature attached to it.

A subagent never spawns another subagent, because only the orchestrator carries the classification of the request and the plan of the phases. A subagent that could spawn a subagent would need that same context, and it would need the same judgment about the specification, the phase and the agent to pick. Giving that judgment to six agents instead of one would let two agents delegate the same task twice, or delegate it to different agents. Keeping the judgment in the orchestrator alone keeps one decision in one place.

## The border between `docs/business/`, `docs/roadmap/` and `docs/architecture/`

The three areas of `docs/` answer three different questions, and a page of one area never restates the rule of another. `docs/business/` states what the system does today, as a rule written with `SHALL` and one scenario for each case that proves it; `tester` derives its test cases from those scenarios. `docs/roadmap/<feature>/` states what a future feature must do, and it is the working folder of the cycle. It holds one file, `TODO.md`: a short introduction, then the phases with their tasks. The five areas of `docs/architecture/` state how the system is built: the stack, the structure, the conventions, the flows and the operations.

This border is why the last phase of every feature goes to `documenter`. It writes the new behavior into `docs/business/`, corrects the page that the feature made false, and deletes
`docs/roadmap/<feature>/`. A page of the architecture that needs a rule links the page of `docs/business/` instead of restating it; a page of `docs/business/` that needs the mechanism links the `key-flows.md` of its area instead of restating it. Two copies of one rule go out of step the day one of them changes; each rule stays true in the one place that states it, and every other page points to it.
