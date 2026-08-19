---
name: "tailadmin-ui-patterns"
description: "TailAdmin dashboard UI patterns and Tailwind classes for the Angular frontend. Use it for a dashboard, an admin panel, a stat card, a data table, a form, a button, an alert, a modal, a sidebar or a header. Verify every class against the frontend and against styles.css. Never invent a class."
---

# TailAdmin UI Patterns Skill

## When to Use This Skill

Invoke this skill for:

- Dashboard interfaces, admin panels and stat cards.
- Data tables, grid layouts and pagination.
- Forms, inputs, selects, checkboxes and buttons.
- Navigation elements: sidebar, header and breadcrumbs.
- Badges, alerts and modals.

## Critical Rule: COPY THE LOCAL MARKUP FIRST

The frontend of this project already holds the TailAdmin markup, converted to
Angular. Find the nearest example under `apps/frontend/src/app`, and copy its
structure. Read `references/fetch-and-verify.md` for the commands and for the
order of the sources.

Do not clone the upstream repository as a first step. It runs an older
generation of TailAdmin, and its class names differ from the ones of this
project.

## The Rule That Matters Most

Never invent a class. Verify each class two ways: search
`apps/frontend/src/styles.css` for the token, and search
`apps/frontend/src/app` for a template that already uses it. If neither search
finds the class, do not use it.

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
