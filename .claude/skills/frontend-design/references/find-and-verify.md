# Find a pattern, and verify a class

## The order of the sources

Use the sources in this order, and stop at the first one that answers your question.

1. **The templates of the frontend.** They already hold the own markup of GitPaaS.
2. **The theme file `apps/frontend/src/styles.css`.** It defines every custom token and every custom
   utility of this project.
3. **The official documentation of Tailwind**, for a utility of the framework itself.

## Source 1 — find the nearest example

```bash
# Find a component that already solves the problem
rtk grep -rl 'text-theme-sm' apps/frontend/src/app --include='*.html'

# Read one whole template, and copy its structure
rtk cat apps/frontend/src/app/features/projects/ui/components/project-card/project-card.component.html

# Find every use of one class
rtk grep -rn 'bg-brand-500' apps/frontend/src/app
```

## Source 2 — verify a class against the theme

A class that `styles.css` does not define, and that Tailwind does not give, does not exist.

```bash
# Step 1 - search the theme block and the custom rules
rtk grep -n 'brand-500' apps/frontend/src/styles.css

# Step 2 - search every template of the frontend
rtk grep -rn 'bg-brand-500' apps/frontend/src/app

# If neither search finds the class, do not use it.
```
