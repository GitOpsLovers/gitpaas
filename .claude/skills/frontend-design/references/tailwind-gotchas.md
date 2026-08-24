# The traps of Tailwind v4

The project runs Tailwind 4.3.3 with `@tailwindcss/postcss`. The migration from v3 is complete, so
this file holds the rules of the engine alone.

- The important modifier goes at the end: `bg-red-500!`.
- A stacked variant applies from the left to the right, which is the reverse order of v3.
- The syntax of an arbitrary variable is `bg-(--brand-color)`, and not `bg-[--brand-color]`.
- The reset of a transform is `scale-none`, `rotate-none` or `translate-none`, and not `transform-none`.
- The default colour of a border and of a ring is `currentColor`, and the default width of a ring is 1px.
- `hover:` applies only on a device that supports the hover.
- A custom utility takes `@utility`, and not `@layer utilities` or `@layer components`.
- `@theme` takes a token that must produce a class or a variant. A plain variable of CSS goes to
  `:root`.
- A variable of `@theme` stays at the top level. It never goes inside a selector or a media query.
- Tailwind reads a source file as plain text. Thus a class that the code builds by concatenation
  never reaches the output.
- The browsers of the target are Safari 16.4+, Chrome 111+ and Firefox 128+.
