# The practice of Tailwind v4 in this project

Five decisions alone, each anchored to a file of `apps/frontend`.

## 1. The utility, then the arbitrary value, then the token

Reach for a utility of Tailwind first. When the value it needs does not exist, write it as an
arbitrary value in the template. Promote it to a token of `@theme` only when the same value repeats
across components, because a token costs a name that every agent must then learn. `--radius-*`,
`--color-brand-*` and `--shadow-theme-*` earned their place that way; a one-off does not.

## 2. The arbitrary value

The syntax is the square bracket: `max-w-[24rem]`
(`features/docker/ui/components/docker-images-table/docker-images-table.component.html:37`) and
`dark:bg-white/[0.03]`, which is how every panel of the dark theme states its surface. An arbitrary
value of a variable of CSS takes the parenthesis in v4 — `bg-(--brand-color)` — not the bracket.

## 3. The custom utility `@utility`

`@utility` is the one abstraction that this project sanctions, and `apps/frontend/src/styles.css`
holds 20 of them, at the lines 188–282. They exist for one shape alone: the sidebar repeats a long
set of classes across an active, an inactive and a hover state, so `menu-item`, `menu-item-active`
and `menu-item-inactive` carry it once.

```css
@utility menu-item {
    @apply relative flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-theme-sm font-medium transition-colors duration-150;
}
```

Add one only for that shape. A card, a button and an alert are components of Angular here.

## 4. The markup that the project does not own

`ng-select` and `highlight.js` render their own DOM, so no template can carry a class on it.
`styles.css` styles them by a plain rule outside every layer, reading the tokens of the theme:
`ng-select` at the lines 301–372, the palette of `highlight.js` at 374–419.

```css
.ng-select .ng-select-container {
    border-radius: var(--radius-lg);
    border-color: var(--color-gray-300);
}
```

Take this path for third-party markup alone, never for markup of the project.

## 5. The response

`--breakpoint-*: initial` deletes the defaults, so the eight breakpoints of `@theme` (lines 17–25)
are the only ones that exist: `2xsm`, `xsm`, `sm`, `md`, `lg`, `xl`, `2xl`, `3xl`. Any other prefix
compiles to nothing. Design the mobile first — the unprefixed class is the small screen, and a
prefix raises it, as
`features/projects/ui/containers/projects-list/projects-list.component.html:2` does with
`grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4`.
