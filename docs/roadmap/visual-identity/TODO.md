# visual-identity

The frontend wears the theme of TailAdmin without a change: its palette, its font Outfit, its shell and its logo. GitPaaS looks like the template, and not like a product of its own.
We give it an own identity with the tokens and the shell alone: a cool slate ramp, a saturated accent, a small radius and a dense rhythm, in the manner of a technical tool for the operations. The light theme leads, and the dark theme follows it.
The organization of the information, the screens, the routes and the flow stay the same. The components of `shared/components/` and the templates of `features/` stay out of scope, so no new primitive of badge, of card or of table belongs to this feature.

## Phase 1 — The tokens

**Agent:** implementer
**Paths:** apps/frontend/src/styles.css

- [x] 1.1 Replace the family Outfit with Inter in the import of the font and in `--font-outfit`, and add a token of a family monospace for the code and for the logs.
- [x] 1.2 Replace the 91 colors of the block `@theme` with a cool slate ramp for `gray`, and with a saturated accent for `brand`. Design the light ramp first, then derive the dark one.
- [x] 1.3 Retune the ramps of `success`, of `warning` and of `error` against the new neutrals.
- [x] 1.4 Add the tokens `--radius-*` that override the default scale of Tailwind with smaller values, so the 127 sites of `rounded-*` change without an edit of a template.
- [x] 1.5 Retune the 8 tokens `--shadow-theme-*` to a low elevation, and check the token `--shadow-focus-ring` against the new accent.
- [x] 1.6 Delete the lines 321 to 946, which hold the dead CSS of ApexCharts, of jVectorMap, of Swiper and of Flatpickr.
- [x] 1.7 Check the contrast of the two themes on five screens: the list of the services, the panel of the health of the server, the form of a provider, a table and a modal.
- [x] 1.8 Run `rtk pnpm run check-types --filter @gitpaas/frontend`.

## Phase 2 — The shell and the mark

**Agent:** implementer
**Paths:** apps/frontend/src/app/layout/ui/, apps/frontend/src/styles.css (the utilities of the menu), apps/frontend/public/images/logo/

- [x] 2.1 Redesign the sidebar: the rhythm of the navigation, the state of the active item, the group of the section, and the mode collapsed.
- [x] 2.2 Rewrite the 21 utilities `menu-item*` and `menu-dropdown-*` of `styles.css` against the new tokens.
- [x] 2.3 Redesign the header: the height, the border, and the group of the actions. The header holds no field of the search, so the plan dropped that part: the product exposes no route and no endpoint of a search, and a new one falls out of the scope of this feature.
- [x] 2.4 Redesign the breadcrumb and the header of the page.
- [x] 2.5 Retune the grid of the layout and the backdrop against the new density.
- [x] 2.6 Draw a new mark of GitPaaS, and replace the four SVGs of the folder of the logo. The mark carries the new accent, and no hex `465FFF` stays in a file.
- [x] 2.7 Check the shell in the two themes, and in the three breakpoints of the mobile, of the tablet and of the desktop.
- [x] 2.8 Run `rtk pnpm run check-types --filter @gitpaas/frontend`.

## Phase 3 — The documentation

**Agent:** documenter
**Paths:** docs/architecture/frontend/, docs/business/, .claude/skills/frontend-design/
**This is the last phase.**

- [ ] 3.1 Rewrite the page of the theme and the pages of `docs/architecture/frontend/` that name TailAdmin, in `conventions.md:43` and in `stack.md:8`.
- [ ] 3.2 Update the references of the skill `frontend-design` with the new tokens and with the new markup of the shell.
- [ ] 3.3 Write the design of the identity into `docs/business/`.
- [ ] 3.4 Delete the folder `docs/roadmap/visual-identity/`, and its line of `docs/roadmap.md`.
