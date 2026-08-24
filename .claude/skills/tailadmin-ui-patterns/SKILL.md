---
name: tailadmin-ui-patterns
description: The markup of the dashboard TailAdmin and its classes of Tailwind, for `apps/frontend`. Use it for a stat card, a table, a form, a button, an alert, a modal, a sidebar or a header.
---

# The patterns of the interface of TailAdmin

The frontend of this project already holds the markup of TailAdmin, converted to Angular. This skill holds no markup, and that is deliberate: the frontend holds the real markup, and it stays correct as the frontend changes.

**Never invent a class.** Read [rules.md](references/rules.md) before you write one line of a template.

## The reference files

| The file | Read it when |
| --- | --- |
| [rules.md](references/rules.md) | You start any task of the interface. It holds the two rules, and the place of the markup of each kind of component. |
| [fetch-and-verify.md](references/fetch-and-verify.md) | You must find a pattern, or verify that a class exists. |
| [custom-configuration.md](references/custom-configuration.md) | You need a color, a size or a shadow of the theme. |
| [anti-patterns.md](references/anti-patterns.md) | You must avoid a known mistake, or run the final checklist. |

## The neighbouring skills

- `frontend-architecture` holds the structure, the layers and the naming. This skill holds the classes alone.
- `tailwind-4-docs` holds the engine of Tailwind. This skill wins over it for a class of this project.
