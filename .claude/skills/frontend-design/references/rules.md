# The rules of the markup of this project

## The three rules

1. **Copy the local markup first.** The frontend already holds the own markup of GitPaaS. Find the
   nearest example under `apps/frontend/src/app`, and copy its structure.
2. **Never invent a class.** Verify each class two ways: search `apps/frontend/src/styles.css` for
   the token, and search `apps/frontend/src/app` for a template that already uses it. If neither
   search finds the class, do not use it.
3. **Never clone an outside template.** This project runs Tailwind v4 and a `@theme` block of its
   own; a class name of another template, of another generation of Tailwind, or of another product
   does not exist here.

## Where the markup lives

This skill holds no markup, and that is deliberate. The frontend holds the real markup, and it stays
correct as the frontend changes.

| You build | Find an example among |
|---|---|
| A card or a stat box | the `*-card` components of each feature |
| A list or a table | the `*-list` containers of each feature |
| The page shell, the sidebar or the header | `apps/frontend/src/app/layout` |
| A form, an input or a button | the containers that create or edit a record |

Read [find-and-verify.md](find-and-verify.md) for the commands that find an example.
