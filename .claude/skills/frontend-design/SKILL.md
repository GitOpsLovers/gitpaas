---
name: frontend-design
description: The design system of `apps/frontend` — the components of `shared/components/` (component-card, alert, modal, confirm-modal, button, input, label, textarea, select2, skeleton), the own theme of Tailwind of GitPaaS, and the practice of Tailwind CSS v4. Use it for a panel, a table, a form, a button, an alert, a modal, a sidebar or a header.
---

# The design of the frontend of GitPaaS

`apps/frontend` runs Tailwind CSS v4. `apps/frontend/src/app/shared/components/` holds the component
of every recurring piece of the dashboard, and `apps/frontend/src/styles.css` holds every token,
every custom utility and every plain rule of its own theme: a cool slate ramp, a saturated violet
accent, a small radius, and a dense rhythm. The code holds the truth; this skill routes to it, and
the little markup that it quotes is copied from those files.

**Reuse a component before you write markup, and never invent a class.** Read
[rules.md](references/rules.md) before you write one line of a template.

| The file | Read it when |
|---|---|
| [rules.md](references/rules.md) | You start any task of the interface: the two rules, the address of every component, the shape of a table, the triad of a screen. |
| [theme.md](references/theme.md) | You need a colour, a size, a shadow or a custom utility of the theme. |
| [anti-patterns.md](references/anti-patterns.md) | You must avoid a known mistake, or run the final checklist. |
| [tailwind-playbook.md](references/tailwind-playbook.md) | You choose between a utility, an arbitrary value, a token and a rule `@utility`, or you style markup of a third party. |
| [tailwind-gotchas.md](references/tailwind-gotchas.md) | You need the rules of the engine of v4 that break the most often. |

## The neighbouring skills

- `frontend-architecture` holds the structure, the layers and the naming. This skill holds the design alone.
- `frontend-unit-testing` holds every convention of a spec.
