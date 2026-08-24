# The rules of the markup of the dashboard

## Copy the local markup first

The frontend of this project already holds the TailAdmin markup, converted to
Angular. Find the nearest example under `apps/frontend/src/app`, and copy its
structure. Read `references/fetch-and-verify.md` for the commands and for the
order of the sources.

Do not clone the upstream repository as a first step. It runs an older
generation of TailAdmin, and its class names differ from the ones of this
project.

## Never invent a class

Never invent a class. Verify each class two ways: search
`apps/frontend/src/styles.css` for the token, and search
`apps/frontend/src/app` for a template that already uses it. If neither search
finds the class, do not use it.

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
