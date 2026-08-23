---
name: project-documentation
description: Use this skill when you write or update a page of `docs/` in this project. It gives the map of the documentation, the page that receives each kind of content, and the house style. Use it before you create a section, and before you create a file.
---

# The documentation of GitPaaS

This skill is the single source of truth for the pages under `docs/`. The `documenter` subagent executes it.

Every command runs through `rtk`, as section 2 of `CLAUDE.md` requires.

## The rule that breaks the most often

**An index page holds no content.** These five files are indexes alone:

- `docs/monorepo-architecture.md`
- `docs/backend-architecture.md`
- `docs/frontend-architecture.md`
- `docs/infrastructure-architecture.md`
- `docs/agents-architecture.md`

Each one holds a title, one or two paragraphs of introduction, and the list `## Sections`. It holds no other section. If you want to add a section to one of these five files, you chose the wrong file. Find the subpage in the map below.

You edit an index page for two reasons alone:

1. You created a new subpage, and you add one line to its list `## Sections`.
2. The introduction became false.

## The map

Each of the five architecture documents owns a folder of the same name. The folder holds the subpages.

| The subpage         | It receives                                                                                       |
|---------------------|---------------------------------------------------------------------------------------------------|
| `stack.md`          | The tool that answers each concern, and the version of that tool.                                 |
| `structure.md`      | The tree of the folders, the layers, the shape of a feature, and the wiring of the modules.       |
| `conventions.md`    | The rule that a developer follows: the naming, the aliases of the imports, the shape of a file.   |
| `key-flows.md`      | The path of a request through the layers, a flow of the business, and the reason of its design.   |
| `operations.md`     | The action that an operator runs on the application.                                              |
| `installation.md`   | The installer. It exists for the infrastructure alone.                                            |

`docs/backend-business/` is a sixth folder, and it carries no index page. It holds the business, and not the architecture: the domain model, the workflow of a deployment, the access, the cleanup and the maintenance of the server. Send a rule of the business there, and send the mechanism of the code to `key-flows.md`.

`docs/agents-architecture/` holds the configuration of the AI, and not the application: the configuration of the agents and the skills, the workflow that they follow, and the metrics of the tokens that a session or a change of that configuration costs.

## Where a new subject goes

1. **Look for the section that already covers the subject.** A change of a feature that a page already describes belongs inside that section. The `providers` feature has a section in `docs/backend-architecture/key-flows.md` and one in `docs/frontend-architecture/key-flows.md`. Extend it; do not open a second section for the same feature.
2. **If the section exists, correct it, and do not append to it.** A change makes a statement false. Search the page for the old statement, and rewrite it. A page that carries the new text and the old text is worse than a page that carries neither.
3. **Use a heading of level 3 for a subject inside a section.** The pages of `key-flows.md` already use `##` for the subject and `###` for the part of it.
4. **Create a new subpage only when no section fits and the subject is large.** Then add its line to the list `## Sections` of the index page in the same edit.
5. **Create no new top-level folder.** Report the need instead. The area `docs/agents-architecture/` already exists for the configuration of the AI, the workflow of the agents and the metrics of the tokens; a subject of that kind goes there, and not into a new folder.

## The border with `openspec/`

- **`docs/` describes the architecture.** It explains the structure, the flow and the reason. You own these pages.
- **`openspec/specs/` holds the requirements.** The commands `/opsx:propose` and `/opsx:sync` own these files. Never write into `openspec/specs/`.

Never state one rule in both places. If a page needs a requirement, link the capability under `openspec/specs/`.

You may mark a task as done in `openspec/changes/<change-id>/tasks.md`. That file is not a specification.

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
