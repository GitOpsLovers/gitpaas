# The theme of the project

## The one authority

`apps/frontend/src/styles.css` defines every custom token and every custom utility of this project.
Read it before you use a class that Tailwind does not give.

| The lines | What they hold |
|---|---|
| 1–6 | The font of Google, `@import "tailwindcss"`, and the variant `dark`, which reads the class `.dark`. |
| 8–166 | The block `@theme`, with every token. |
| 176–191 | The block `@layer base`. |
| 193–294 | 21 rules `@utility`, for the item of a menu, the badge of a dropdown and the scrollbars. |
| 296 to the end | A block `@layer utilities`, then the plain rules of the checkbox of a table, of ApexCharts and of jVectorMap. |

```bash
# Read the block of the theme
rtk sed -n '8,166p' apps/frontend/src/styles.css

# Find one token
rtk grep -n 'brand-500' apps/frontend/src/styles.css

# List the custom utilities
rtk grep -n '@utility' apps/frontend/src/styles.css
```

## How a token becomes a class

Tailwind v4 declares a token as a custom property of CSS inside `@theme`, and it builds the name of
the class from that property. The property `--color-brand-500` gives `bg-brand-500`,
`text-brand-500` and `border-brand-500`.

A line `--font-*: initial;` deletes the default scale of Tailwind for that group. Thus the block
declares every value that the group holds, and no other value exists.

## The groups of the theme

| The prefix in `@theme` | It produces |
|---|---|
| `--font-*` | The family of the font, for example `font-outfit`. |
| `--breakpoint-*` | The prefixes of the response, `2xsm`, `xsm` and `3xl` included. |
| `--text-title-*` | The sizes of a large heading, with their height of line. |
| `--text-theme-*` | The sizes of the body, for example `text-theme-sm`. |
| `--color-*` | The 91 colours, in the families `brand`, `blue`, `gray`, `orange`, `success`, `warning`, `error` and `theme`. |
| `--shadow-*`, `--drop-shadow-*` | The shadows of the theme. |
| `--z-index-*` | The seven levels of the stack. |

## Read the custom utilities before you build a menu

A rule `@utility` can already give the classes that you need, for example `menu-item`,
`menu-item-active` or `custom-scrollbar`. Read the range before you write a template of the sidebar.

```bash
rtk sed -n '193,294p' apps/frontend/src/styles.css
```
