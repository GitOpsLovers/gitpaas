# skeleton-loaders

Every loading state of `apps/frontend` is a short sentence, and it takes much less height than the content that replaces it. So the page jumps at each response of the API. We add one shared component `app-skeleton`, with a `variant` input, and we use it at every site that loads dynamic content. The error state and the empty state also take a minimum height, so the page keeps one height in all four states. The select controls of `service-provider` stay as they are, and the backend stays out of scope.

## Phase 1 — The shared component

**Agent:** implementer
**Paths:** apps/frontend/src/app/shared/components/skeleton/

- [x] 1.1 Verify that `animate-pulse` exists in the built CSS of Tailwind v4. If it is absent, add the animation to the block `@theme` of `apps/frontend/src/styles.css`.
- [x] 1.2 Create `skeleton.component.ts` and `skeleton.component.html` with the signal inputs `variant` (`text | card | row | circle`), `count` (default 1) and `className`.
- [x] 1.3 Resolve the classes of the variant with a accessor `get variantClasses()`, as `button.component.ts` does. Use `output()`, and never `@Output()`.
- [x] 1.4 Give the bar the classes `rounded-lg bg-gray-100 motion-safe:animate-pulse dark:bg-gray-800`. Add no attribute of ARIA.
- [x] 1.5 Write `skeleton.component.spec.ts` for the four variants and for the input `count`.

## Phase 2 — The grids of cards

**Agent:** implementer
**Paths:** apps/frontend/src/app/features/{projects,providers,namespaces,services}/ui/containers/*-list/

- [x] 2.1 Replace the sentence of the loading state of the four list containers with `app-skeleton` of the variant `card` and `count` 8, inside the same classes of the grid.
- [x] 2.2 Give the empty state and the error state of the four containers a minimum height that equals the height of one card.
- [x] 2.3 Extend the spec of each container with a test of the branch of the loading state.

## Phase 3 — The tables

**Agent:** implementer
**Paths:** apps/frontend/src/app/features/{services,domains,containers,networks}/ui/components/

- [x] 3.1 In the six tables, keep the real `<thead>` visible, and fill the `<tbody>` with 5 rows of `app-skeleton` of the variant `row`.
- [x] 3.2 Give the empty state and the error state of the six tables a minimum height that equals the height of 5 rows.
- [x] 3.3 Extend the spec of each component with a test of the branch of the loading state.

## Phase 4 — The forms and the panel

**Agent:** implementer
**Paths:** apps/frontend/src/app/features/{projects,providers,namespaces,services,server}/ui/

- [x] 4.1 Replace the sentence of the loading state of the five edit pages with `app-skeleton` of the variant `text`, which copies the count of the fields of the form.
- [x] 4.2 Replace the sentence of `server-health-panel` with `app-skeleton`, which copies the shape of the panel.
- [x] 4.3 Give the error state of the five pages and of the panel a minimum height.
- [x] 4.4 Extend the spec of each page and of the panel with a test of the branch of the loading state.

## Phase 5 — The documentation

**Agent:** documenter
**This is the last phase.**

- [ ] 5.1 Write the behavior of the loading state into the page of `docs/business/` that covers the shell of the frontend.
- [ ] 5.2 Add `app-skeleton` to the page of `docs/architecture/frontend/` that lists the shared components.
- [ ] 5.3 Delete the folder `docs/roadmap/skeleton-loaders/`, and remove its line of `docs/roadmap.md`.
