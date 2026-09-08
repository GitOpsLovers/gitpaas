# The mistakes to avoid, and the final checklist

**Never invent a class.** A name that reads like a component — `card-dashboard`, `btn-primary`,
`dashboard-widget` — is invented. This project composes from the utilities of Tailwind and the
tokens of its own `@theme` block, and it declares no class of a component.

**Never use a token of another template.** If a search of `apps/frontend/src` returns zero result
for a name, **the class is not of this design system**, whatever its source. Its own tokens are
`gray-*` for the neutral, `brand-*` for the accent, `blue-light-*` for the informative blue, and
`success-*`, `warning-*` and `error-*` for the state.

| A name of the upstream template | What you use here |
|---|---|
| `boxdark`, `boxdark-2`, `strokedark` | `gray-*`, and the variant `dark:` |
| `meta-1` to `meta-10` | `success-*`, `warning-*`, `error-*`, `brand-*` |
| `primary`, `secondary` | `brand-*` |
| `body`, `bodydark`, `whiten`, `whiter` | `gray-*` |

```
[ ] I reused the component of shared/components/ instead of writing its markup again
[ ] I verified every custom class in apps/frontend/src/styles.css
[ ] I searched the templates AND the files .ts for an example
[ ] I invented no class, and I copied no name from the upstream template
[ ] I gave the variant dark: to each colour that needs one
```
