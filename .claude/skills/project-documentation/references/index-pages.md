# The eight index pages

## The rule that breaks the most often

**An index page holds no content.** These eight files are indexes alone:

- `docs/architecture.md`, and the five pages that it lists: `docs/architecture/monorepo.md`, `docs/architecture/backend.md`, `docs/architecture/frontend.md`, `docs/architecture/infrastructure.md` and `docs/architecture/agents.md`
- `docs/business.md`
- `docs/roadmap.md`

Each one holds a title, one or two paragraphs of introduction, and the list of its children. It holds no other section. If you want to add a section to one of these eight files, you chose the wrong file. Find the subpage in the map below.

`docs/architecture.md` is an index of indexes: it lists the five areas, and each area page lists its own subpages. So a new subpage adds one line to the page of its area, and never to `docs/architecture.md`.

You edit an index page for two reasons alone:

1. You created a new subpage, and you add one line to its list `## Sections`.
2. The introduction became false.
