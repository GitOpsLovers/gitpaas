# The mistakes to avoid, and the final checklist

## Never invent a class

```html
<!-- WRONG. None of these classes exists. -->
<div class="card-dashboard">
<div class="dashboard-header">
<button class="btn-primary">
<div class="dashboard-widget">
```

A name that reads like a component is almost always invented. This project composes a card from the
utilities of Tailwind, plus the tokens of its own `@theme` block.

## Never use a token of another template

A name that a search of `apps/frontend/src` returns zero result for does not exist here, whatever
its source. This project's own tokens are `gray-*` for the neutral, `brand-*` for the accent, and
`success-*`, `warning-*` and `error-*` for the state.

| A name of another template | What you use here |
|---|---|
| `boxdark`, `boxdark-2`, `strokedark` | `gray-*`, and the variant `dark:` |
| `meta-1` to `meta-10` | `success-*`, `warning-*`, `error-*`, `brand-*` |
| `primary`, `secondary` | `brand-*` |
| `body`, `bodydark`, `whiten`, `whiter` | `gray-*` |

## Never invent a value of the spacing

```html
<!-- WRONG. Tailwind builds the scale from --spacing, so an arbitrary step does not exist. -->
<div class="p-7.6">
<div class="w-73">
```

Use a step of the scale, or an arbitrary value with the square brackets, for example `w-[73px]`.

## Never mix another framework

```html
<!-- WRONG. These are classes of Bootstrap. -->
<div class="card">
<button class="btn btn-primary">
<div class="container-fluid row">
```

## The checklist before you write a template

```
[ ] I found an example of this kind of component under apps/frontend/src/app
[ ] I verified every custom class in apps/frontend/src/styles.css
[ ] I copied the structure of the markup of that example
[ ] I invented no class
[ ] I copied no name from the upstream template
[ ] I gave the variant dark: to each colour that needs one
```
