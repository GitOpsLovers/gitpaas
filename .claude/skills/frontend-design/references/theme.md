# The theme of the project

`apps/frontend/src/styles.css` defines every custom token, every custom utility and every plain rule
of this project. Read it before you use a class that Tailwind does not give.

| The lines | What they hold |
|---|---|
| 1–6 | The fonts of Google (Inter, JetBrains Mono), `@import "tailwindcss"`, and the variant `dark`, which reads the class `.dark`. |
| 8–161 | The block `@theme`, with every token. |
| 163–186 | The block `@layer base`: the colour of the default border, the cursor of a button, the body. |
| 188–282 | The 20 rules `@utility`: the item of a menu, the badge of a dropdown, `no-scrollbar`. |
| 283–299 | A block `@layer utilities`, which hides the spinners of an input `date`, `time` and `number`. |
| 301–372 | The plain rules of `ng-select`, light and dark. |
| 374–419 | The palette of `highlight.js` for the viewer of YAML, light and dark. |

## How a token becomes a class

Tailwind v4 builds the name of the class from the custom property: `--color-brand-500` gives
`bg-brand-500`, `text-brand-500` and `border-brand-500`.

Only two groups carry `: initial`, and so lose their default scale: `--font-*` (line 9) and
`--breakpoint-*` (line 17). Every other default of Tailwind still compiles — `rounded-full`,
`text-sm`, the whole default palette. **That the project does not use the default palette is a
discipline, not a law of the compiler**: a colour comes from the families below, never from
`red-500` or `slate-200`.

| The prefix in `@theme` | It produces |
|---|---|
| `--font-*` | `font-inter` for the text, `font-mono` for the code and the logs. No other family exists. |
| `--breakpoint-*` | The only prefixes of the response: `2xsm`, `xsm`, `sm`, `md`, `lg`, `xl`, `2xl`, `3xl`. |
| `--text-title-*` | The five sizes of a large heading, with their height of line. |
| `--text-theme-*` | `text-theme-xl`, `-sm`, `-xs`. They belong to the shell of `layout/`, where all 14 uses live. |
| `--radius-*` | `rounded-xs` to `rounded-4xl`. It overrides the default scale with smaller values, so every `rounded-*` stays tight. |
| `--color-*` | The families `brand` (the violet accent), `blue-light` (the informative blue), `gray` (the cool slate neutral), `success`, `warning`, `error`. |
| `--shadow-*` | `shadow-theme-xs` to `shadow-theme-xl`, and `shadow-tooltip`. A low elevation: the border carries the edge. |
| `--z-index-*` | The seven levels of the stack, `z-1` to `z-999999`. |

## The three points that a new component must obey

- **The scale of the text is the one of Tailwind.** The body of the application uses `text-sm`
  (152 uses), `text-xs` (69) and `text-base` (13). A new component takes those; `text-theme-*` stays
  in `layout/`.
- **The informative blue is `blue-light`, never `blue`**: `bg-blue-light-50`,
  `border-blue-light-200`, `text-blue-light-600`, as
  `apps/frontend/src/app/shared/components/alert/alert.component.ts:23` writes them.
- **The surface of a panel in the dark theme is `dark:bg-white/[0.03]`**, not a token of `gray`.
  `shared/components/component-card/component-card.component.html:1` sets it, and 12 files repeat it.

A rule `@utility` may already give the classes that a template of `layout/` needs — `menu-item`,
`menu-item-active`, `menu-dropdown-item`, `no-scrollbar`. Read the lines 188–282 first.
