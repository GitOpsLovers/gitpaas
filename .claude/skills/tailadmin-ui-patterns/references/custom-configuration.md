# TailAdmin: The Custom Configuration

## The one authority

`apps/frontend/src/styles.css` defines every custom token of this project. The
`@theme` block runs from line 8 to line 166. Read that block before you use a
token that Tailwind does not give.

```bash
# Read the whole theme block
rtk sed -n '8,166p' apps/frontend/src/styles.css

# Find one token
rtk grep -n 'brand-500' apps/frontend/src/styles.css
```

The project runs Tailwind v4. Tailwind v4 declares a token as a CSS custom
property inside `@theme`, and it builds the class name from that property. The
property `--color-brand-500` gives the classes `bg-brand-500`, `text-brand-500`
and `border-brand-500`.

## The groups of the theme

| Prefix in `@theme` | It produces |
|---|---|
| `--font-*` | The font family, for example `font-outfit`. |
| `--breakpoint-*` | The responsive prefixes, `2xsm` and `xsm` included. |
| `--text-title-*` | The large heading sizes, with their line height. |
| `--text-theme-*` | The body sizes, for example `text-theme-sm`. |
| `--color-*` | Every color, for example `bg-brand-500`. |
| `--shadow-*` | The shadows of the theme. |

## Caution — do not use the tokens of the older template

The upstream TailAdmin template of the previous generation held a different
palette in a `tailwind.config.js` file. Those names do not exist here.

| Name of the older template | State in this project |
|---|---|
| `boxdark`, `boxdark-2` | It does not exist. `grep` returns 0 files. |
| `meta-1` to `meta-10` | It does not exist. |
| `primary`, `secondary` | It does not exist. Use `brand-*`. |
| `body`, `bodydark` | It does not exist. Use `gray-*`. |
| `strokedark`, `whiten`, `whiter` | It does not exist. |

If you find one of these names in a document or in an example, map it onto a
token of `styles.css` before you write the markup.

## The custom rules below the theme

`styles.css` also holds component rules that use `@apply`. They start after the
`@theme` block. Read them when you build a menu item or a sidebar element,
because a rule can already give the classes that you need.

```bash
rtk sed -n '167,260p' apps/frontend/src/styles.css
```
