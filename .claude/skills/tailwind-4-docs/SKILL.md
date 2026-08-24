---
name: tailwind-4-docs
description: Tailwind CSS v4 reference - utilities, variants, @theme. The skill tailadmin-ui-patterns wins over it.
compatibility: Requires git, Python 3, and internet access to initialize the Tailwind docs snapshot from tailwindcss.com.
---

# Tailwind CSS v4

A local snapshot of the official documentation of Tailwind CSS v4. `tailadmin-ui-patterns` holds the classes of the components of the dashboard of this project, and it
wins over this skill. Read this skill for the engine of Tailwind: a utility, a variant, or the configuration `@theme`.

## The reference files

| The file | Read it when |
| --- | --- |
| [initialization.md](references/initialization.md) | The snapshot is absent or stale, or you need the entry points, the handling of the MDX, or the checklist of the migration. |
| [engineering-playbook.md](references/engineering-playbook.md) | You implement, you refactor or you review a style. |
| [gotchas.md](references/gotchas.md) | You need a quick scan of the traps of the migration of v3 to v4. |
| `references/docs/<slug>.mdx` | You need the official page of one utility, one variant or one directive. Find the slug in `references/docs-index.tsx`. |
| `references/docs-index.tsx` | You need the map of the categories and of the slugs. |
| `references/docs-source.txt` | You need the repository, the commit and the date of the snapshot. |

Read one reference file for your task. Do not read the whole folder.
