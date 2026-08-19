---
name: "tailadmin-ui-patterns"
description: "TailAdmin dashboard UI framework patterns and Tailwind CSS classes. ALWAYS use this skill when: (1) Building any dashboard or admin panel interface, (2) Creating data tables, cards, charts, or metrics displays, (3) Implementing forms, buttons, alerts, or modals, (4) Building navigation (sidebar, header, breadcrumbs), (5) Any UI work that should follow TailAdmin design. This skill REQUIRES fetching from the official GitHub repository to ensure accurate class usage - NEVER invent classes."
---

# TailAdmin UI Patterns Skill

## When to Use This Skill

Invoke this skill for:

- Dashboard interfaces, admin panels and stat cards.
- Data tables, grid layouts and pagination.
- Forms, inputs, selects, checkboxes and buttons.
- Navigation elements: sidebar, header and breadcrumbs.
- Badges, alerts and modals.

## Critical Rule: FETCH BEFORE IMPLEMENTING

Fetch the official TailAdmin source before you write any UI code. Read the exact
markup from that source, then copy it. Read `references/fetch-and-verify.md` for
the commands.

## The Rule That Matters Most

Never invent a class. Verify each class against the TailAdmin source before you
use it.

## Reference Files

| File | Read it when |
|------|--------------|
| `references/fetch-and-verify.md` | You must fetch the source, or verify that a class exists. |
| `references/custom-configuration.md` | You need the custom colors, spacing or shadows of TailAdmin. |
| `references/layout.md` | You build the page shell, the sidebar or the header. |
| `references/cards-and-feedback.md` | You build a card, a stat box, a badge or an alert. |
| `references/tables.md` | You build a data table or a pagination control. |
| `references/forms-and-buttons.md` | You build an input, a select, a toggle or a button. |
| `references/modal.md` | You build a modal dialog. |
| `references/anti-patterns.md` | You must avoid a known mistake, or run the final checklist. |
