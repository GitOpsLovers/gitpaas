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
| `references/fetch-and-verify.md` | You must find a pattern, or verify that a class exists. |
| `references/custom-configuration.md` | You need a color, a size or a shadow of the theme. |
| `references/anti-patterns.md` | You must avoid a known mistake, or run the final checklist. |

## Where the markup lives

This skill holds no markup, and that is deliberate. The frontend holds the real
markup, and it stays correct as the frontend changes. Find the component that
you need under `apps/frontend/src/app`, and copy its structure.

| You build | Find an example among |
|---|---|
| A card or a stat box | the `*-card` components of each feature |
| A list or a table | the `*-list` containers of each feature |
| The page shell, the sidebar or the header | `apps/frontend/src/app/layout` |
| A form, an input or a button | the containers that create or edit a record |

Read `references/fetch-and-verify.md` for the commands that find an example.
