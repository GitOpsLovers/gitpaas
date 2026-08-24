---
name: project-documentation
description: The map of `docs/`, the page that receives each kind of content, and the house style. Use it before you create a section, and before you create a file.
---

# The documentation of GitPaaS

The single source of truth for the pages under `docs/`. The subagent `documenter` executes it. Every command runs through `rtk`.

`docs/` holds three areas, and each one answers one question. Never state one rule in two areas.

| The question     | The area             |
| ---------------- | -------------------- |
| How is it built? | `docs/architecture/` |
| What does it do? | `docs/business/`     |
| What will it do? | `docs/roadmap/`      |

## The reference files

| The file                                        | Read it when                                                                                                |
| ----------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| [index-pages.md](references/index-pages.md)     | Before you edit any page. It names the eight indexes that hold no content. This rule breaks the most often. |
| [placement.md](references/placement.md)         | You do not know which page takes your subject, or you want to create a file.                                |
| [architecture.md](references/architecture.md)   | You write into `docs/architecture/`. It gives the five areas and the six subpages.                          |
| [business-page.md](references/business-page.md) | You write into `docs/business/`. It gives the shape with `SHALL` and with a scenario.                       |
| [roadmap.md](references/roadmap.md)             | You write into `docs/roadmap/`. It gives the one file `TODO.md`, and the shape of a phase.                  |
| [style.md](references/style.md)                 | You write any prose. It gives the house style.                                                              |
| [checks.md](references/checks.md)               | You finished, and you report. It gives the four checks.                                                     |

Read the file that your task needs. Do not read the whole folder.
