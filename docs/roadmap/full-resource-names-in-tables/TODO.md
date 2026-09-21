# The full names in the tables

The nine tables of the frontend cut the name of a resource with three dots, so the user cannot read it. Each table shows the name in full: a name wraps with `break-words`, and it takes a second line only when it is very long. The other columns become narrower, so the name column gets the space. The image, host, mountpoint, network, mount and value columns, the cards, the list of the deployments, and the short ID of the images stay out of scope.

## Phase 1 — The name column of the nine tables

**Agent:** implementer
**Paths:** apps/frontend/src/app/features/

- [x] 1.1 In the name cell of the nine tables (docker containers, images, networks, volumes; service containers, domains, networks, volumes, variables), remove `max-w-* truncate`, and add `break-words`.
- [x] 1.2 Keep the `title` tooltip of a name cell only where it adds a value that the cell does not show.
- [x] 1.3 Make the name cell of `service-volumes` show `daemonName` in full.
- [x] 1.4 Give the other columns of each table less width, so that a name of normal length stays on one line on a desktop screen.
- [x] 1.5 Update the unit tests that assert the classes or the text of a name cell.
- [x] 1.6 `rtk pnpm run check-types --filter @gitpaas/frontend` passes.

## Phase 2 — The documentation

**Agent:** documenter
**This is the last phase.**

- [ ] 2.1 In `.claude/skills/frontend-design/references/rules.md`, state that the name cell of a table never truncates and wraps with `break-words`.
- [ ] 2.2 In `rules.md`, remove the `project-networks` table, which does not exist.
- [ ] 2.3 In `tailwind-playbook.md`, replace the example of `max-w-[24rem]`, which no longer exists.
- [ ] 2.4 Write the behavior into the page of `docs/business/` that describes the tables, if one describes them.
- [ ] 2.5 Delete `docs/roadmap/full-resource-names-in-tables/`, and remove its line from `docs/roadmap.md`.
