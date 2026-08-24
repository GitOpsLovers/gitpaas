# The snapshot: how to use it, and how to refresh it

The snapshot of the documentation is not in Git. `references/.gitignore` ignores `references/docs/`,
`references/docs-index.tsx` and `references/docs-source.txt`, and the script of the synchronization
writes them locally.

## Quick start

1. Check whether the docs snapshot is initialized (`references/docs/` and `references/docs-index.tsx` exist).
2. If the snapshot is missing or older than one week, stop and ask to run the initialization step in "Initialization" before continuing. Do not answer the user's question until the snapshot is initialized.
3. Identify the topic (utility, variant, config, migration, compatibility, implementation, refactor, review).
4. Find the matching doc in `references/docs-index.tsx`.
5. Load only the relevant file from `references/docs/`.
6. For implementation, refactor, or review tasks, also load `references/engineering-playbook.md`.
7. Apply guidance and call out any breaking changes or constraints.

## Initialization (required once per install)

Run the sync script to download the Tailwind docs locally. This requires network access, git, and Python 3:

```
python skills/tailwind-4-docs/scripts/sync_tailwind_docs.py --accept-docs-license
```

This pulls content from `tailwindlabs/tailwindcss.com`. That repo is source-available and explicitly not open-source, so the user must accept its license before downloading and keep the snapshot local.

If you cannot run tools or have no internet access, ask the user to run the exact command above in a terminal, then continue once `references/docs/` and `references/docs-index.tsx` exist.

If the snapshot is missing or older than one week, you must ask for permission to run the command or ask the user to run it. Do not proceed with Tailwind guidance until the snapshot is initialized or refreshed.

If initialization is blocked (no internet or no write access), use `references/gotchas.md` as a limited fallback and ask the user to consult the official docs. For implementation, refactor, or review tasks, `references/engineering-playbook.md` can also serve as a limited fallback.

## MDX handling

- Treat `export const title` and `export const description` as metadata.
- Read JSX callouts like `<TipInfo>` or `<TipBad>` as guidance text.

## Common entry points

- Migration: `references/docs/upgrade-guide.mdx`, `references/docs/compatibility.mdx`.
- Implementation/refactor/review: `references/engineering-playbook.md`.
- Gotchas overview: `references/gotchas.md`.
- Configuration and directives: `references/docs/functions-and-directives.mdx`, `references/docs/adding-custom-styles.mdx`, `references/docs/theme.mdx`.
- Variants and responsive patterns: `references/docs/hover-focus-and-other-states.mdx`, `references/docs/responsive-design.mdx`.
- Core behavior: `references/docs/preflight.mdx`, `references/docs/detecting-classes-in-source-files.mdx`.

## Migration checklist

When upgrading from v3 to v4, always confirm the following in the docs:

- Browser support and compatibility expectations.
- Tooling changes: `@tailwindcss/postcss`, `@tailwindcss/cli`, `@tailwindcss/vite`.
- Import syntax: `@import "tailwindcss"` replaces `@tailwind` directives.
- Utility renames/removals, prefix format, and important modifier placement.
- Changes to variants, transforms, and arbitrary value syntax.

## Update workflow

Run `scripts/sync_tailwind_docs.py` to refresh the snapshot. Use `--local-repo` if you already have a local clone of `tailwindlabs/tailwindcss.com` to speed up syncs. Always pass `--accept-docs-license`.
