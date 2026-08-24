---
name: frontend-design
description: The design system of `apps/frontend` — the theme of Tailwind, the markup of the dashboard TailAdmin, and the practice of Tailwind CSS v4. Use it for a stat card, a table, a form, a button, an alert, a modal, a sidebar or a header.
---

# The design of the frontend of GitPaaS

`apps/frontend` runs Tailwind CSS v4. It already holds the markup of the dashboard TailAdmin,
converted to Angular, and `apps/frontend/src/styles.css` holds every token and every custom utility.

This skill holds two tiers:

- **The design system of this project.** The templates of `apps/frontend/src/app` and the file
  `styles.css` hold the truth. This skill routes to them, and it holds no markup.
- **The practice of Tailwind v4.** Read it for a decision of the engine that the project does not
  already answer.

**Never invent a class.** Read [rules.md](references/rules.md) before you write one line of a template.

## The design system of this project

| The file | Read it when |
| --- | --- |
| [rules.md](references/rules.md) | You start any task of the interface. It holds the three rules, and the place of the markup of each kind of component. |
| [find-and-verify.md](references/find-and-verify.md) | You must find a pattern, or verify that a class exists. |
| [theme.md](references/theme.md) | You need a colour, a size, a shadow or a custom utility of the theme. |
| [anti-patterns.md](references/anti-patterns.md) | You must avoid a known mistake, or run the final checklist. |

## The practice of Tailwind v4

| The file | Read it when |
| --- | --- |
| [tailwind-playbook.md](references/tailwind-playbook.md) | You choose between a utility, a token, a custom utility and a component class, or you review a style. |
| [tailwind-gotchas.md](references/tailwind-gotchas.md) | You need the rules of the engine of v4 that break the most often. |

## The neighbouring skills

- `frontend-architecture` holds the structure, the layers and the naming. This skill holds the design alone.
- `frontend-unit-testing` holds every convention of a spec.
