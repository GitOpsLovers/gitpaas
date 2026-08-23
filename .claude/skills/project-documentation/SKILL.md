---
name: project-documentation
description: Use this skill when you write or update a page of `docs/` in this project. It gives the map of the documentation, the page that receives each kind of content, and the house style. Use it before you create a section, and before you create a file.
---

# The documentation of GitPaaS

This skill is the single source of truth for the pages under `docs/`. The `documenter` subagent executes it.

Every command runs through `rtk`, as section 2 of `CLAUDE.md` requires.

## The rule that breaks the most often

**An index page holds no content.** These eight files are indexes alone:

- `docs/architecture.md`, and the five pages that it lists: `docs/architecture/monorepo.md`, `docs/architecture/backend.md`, `docs/architecture/frontend.md`, `docs/architecture/infrastructure.md` and `docs/architecture/agents.md`
- `docs/business.md`
- `docs/roadmap.md`

Each one holds a title, one or two paragraphs of introduction, and the list of its children. It holds no other section. If you want to add a section to one of these eight files, you chose the wrong file. Find the subpage in the map below.

`docs/architecture.md` is an index of indexes: it lists the five areas, and each area page lists its own subpages. So a new subpage adds one line to the page of its area, and never to `docs/architecture.md`.

You edit an index page for two reasons alone:

1. You created a new subpage, and you add one line to its list `## Sections`.
2. The introduction became false.

## The map

`docs/` holds three kinds of area. Find the kind first, and then find the page.

| The kind | The area | It answers |
|---|---|---|
| The architecture | `docs/architecture/` | How the system is built |
| The business | `docs/business/` | What the system does today |
| The roadmap | `docs/roadmap/` | What the system does not do yet |

### The architecture

`docs/architecture/` holds five areas. Each area is one page and one folder of the same name, and the folder holds the subpages.

| The area | It covers |
|---|---|
| `monorepo` | The repository, the packages and the pipeline of Turborepo. |
| `backend` | The NestJS application. |
| `frontend` | The Angular application. |
| `infrastructure` | The compose stacks, the installer and the server. |
| `agents` | The configuration of the AI, and not the application. |

One area takes the same set of subpages.

| The subpage         | It receives                                                                                       |
|---------------------|---------------------------------------------------------------------------------------------------|
| `stack.md`          | The tool that answers each concern, and the version of that tool.                                 |
| `structure.md`      | The tree of the folders, the layers, the shape of a feature, and the wiring of the modules.       |
| `conventions.md`    | The rule that a developer follows: the naming, the aliases of the imports, the shape of a file.   |
| `key-flows.md`      | The path of a request through the layers, a flow of the business, and the reason of its design.   |
| `operations.md`     | The action that an operator runs on the application.                                              |
| `installation.md`   | The installer. It exists for the infrastructure alone.                                            |

The card `.claude/rules/agent-rules.md` is the short form of `structure.md` and of `conventions.md` of the two applications. If you change one of those four pages, read the card, and correct it in the same commit.

`docs/architecture/agents/` holds the configuration of the AI, and not the application: the configuration of the agents and the skills, and the workflow that they follow.

### The business

`docs/business/` states what the system does for its user. One page holds one capability, and its name is the name of that capability. `docs/business.md` is its index.

**The border with `key-flows.md`.** A page of the business states the rule; the `key-flows.md` of the area states the mechanism that carries it. "A secret never leaves the server in an answer of the API" is a rule, and it belongs to the business. "The adapter encrypts with AES-256-GCM, and it reads the key from `SECRETS_ENCRYPTION_KEY`" is a mechanism, and it belongs to `key-flows.md`. Never state one of the two in the other place.

A page of the business takes this shape:

```markdown
# <the capability>

## Purpose

One paragraph. What the capability gives the user.

## <the rule>

The system SHALL <do the thing>, <under this condition>.

One or two paragraphs of the detail, and the reason.

### Scenario: <the case>

- **WHEN** <the situation>
- **THEN** <the result>
```

Write the rule with `SHALL`, so it states an obligation and not a habit. Write one scenario for each case that proves the rule, because `tester` derives one test from one scenario. A rule with no scenario is a rule that nobody checks.

### The roadmap

`docs/roadmap/<feature>/` holds one future feature, and it is the working folder of the cycle of the specification-driven development. `docs/roadmap.md` is its index. The folder holds three files.

| The file | It holds | Who writes it |
|---|---|---|
| `TODO.md` | Why the feature matters, what must change, what stays out of scope, and what it touches | The user, or the orchestrator |
| `research.md` | What the system does today, which pages of the business the feature changes, which options exist, and what stays unknown | `researcher` |
| `plan.md` | The decisions, the option that each one refused, the rules that the feature adds, and the phases with their tasks | The orchestrator |

`plan.md` holds three parts, in this order.

1. **The decisions.** Each one names the option that it refused, and the reason.
2. **The rules that this feature adds.** One section for one capability, written in the shape of a page of the business, with `SHALL` and with a scenario for each case. This part is the contract of the feature: `tester` derives its cases from it, and `documenter` moves it into `docs/business/` in the last phase.
3. **The phases.** One phase for one Pull Request.

A phase takes this shape:

```markdown
### Phase <n> — <the subject>

**Agent:** implementer
**Paths:** apps/backend/src/features/<feature>/
**This is the last phase.**          (on the last phase alone)

- [ ] <n>.1 <one task that an agent can verify>
```

The last phase always goes to `documenter`, and it writes the behavior into `docs/business/`, corrects the pages that the feature made false, and deletes the folder of the roadmap.

When the last phase merges, the folder goes away. So `docs/roadmap/` holds the future alone, and `docs/business/` holds the present.

## Where a new subject goes

1. **Look for the section that already covers the subject.** A change of a feature that a page already describes belongs inside that section. The `providers` feature has a section in `docs/architecture/backend/key-flows.md` and one in `docs/architecture/frontend/key-flows.md`. Extend it; do not open a second section for the same feature.
2. **If the section exists, correct it, and do not append to it.** A change makes a statement false. Search the page for the old statement, and rewrite it. A page that carries the new text and the old text is worse than a page that carries neither.
3. **Use a heading of level 3 for a subject inside a section.** The pages of `key-flows.md` already use `##` for the subject and `###` for the part of it.
4. **Create a new subpage only when no section fits and the subject is large.** Then add its line to the list `## Sections` of the index page in the same edit.
5. **Create no new top-level folder.** Report the need instead. `docs/architecture/agents/` already exists for the configuration of the AI; `docs/business/` exists for a rule of the business; `docs/roadmap/` exists for a feature that nobody built yet. A subject of one of those kinds goes there, and not into a new folder.

## The three borders

| The question | The area |
|---|---|
| How is it built? | `docs/architecture/` |
| What does it do? | `docs/business/` |
| What will it do? | `docs/roadmap/` |

Never state one rule in two areas. A page of the architecture that needs a rule links the page of the business instead of restating it. Two copies of one rule go out of step the day one of them changes.

You may mark a task as done in `docs/roadmap/<feature>/plan.md`. You write `research.md` only when the prompt asks you for the research. You never write `plan.md`; the orchestrator owns that file.

## The style

- **Write in ASD-STE100 Simplified Technical English.** Use one word for one meaning, the active voice, and a simple tense.
- **Match the page that you edit.** Read the sections around yours, and copy their length of paragraph, their use of a table, and their use of a bullet. A dense block of six lines inside a page of short paragraphs breaks the page.
- **Describe the pattern, and not the inventory.** Give one example; do not list every file. A catalog goes stale.
- **Name a symbol and its path one time**, at the place where you introduce it. Do not repeat the path at each mention.
- **Explain the reason.** The value of the page is the answer to "why is it arranged this way".
- Use a fenced code block with a hint of the language, and a diagram in ASCII or in Mermaid for a flow.

## Before you report

Run these four checks:

1. `rtk git diff --stat docs/` shows the pages that you meant to change, and no index page that you did not mean to change.
2. Every statement traces to a file that you read.
3. Every link and every path resolves.
4. No section of yours repeats a section that the page already holds.
