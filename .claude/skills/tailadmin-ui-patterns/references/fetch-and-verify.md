# TailAdmin: Find a Pattern, and Verify a Class

## The order of the sources

Use the sources in this order. Stop at the first one that answers your question.

1. **The frontend of this project.** It already holds the TailAdmin markup,
   converted to Angular. 23 template files use the classes.
2. **The theme file `apps/frontend/src/styles.css`.** It defines every custom
   token in a `@theme` block.
3. **The reference files of this skill.** They hold the markup of each component.
4. **The upstream repository.** Use it last, and read the caution below first.

## Source 1 — the frontend of this project

Find the nearest example, and copy its markup:

```bash
# Find a component that already solves the problem
rtk grep -rl 'text-theme-sm' apps/frontend/src/app --include='*.html'

# Read one whole template, and copy its structure
rtk cat apps/frontend/src/app/features/projects/ui/components/project-card/project-card.component.html

# Find every use of one class
rtk grep -rn 'bg-brand-500' apps/frontend/src/app
```

## Source 2 — verify a class against the theme

The project defines its custom classes in one file. A class that this file does
not define, and that Tailwind does not give, does not exist.

```bash
# Step 1 - search the theme block and the custom rules
rtk grep -n 'brand-500' apps/frontend/src/styles.css

# Step 2 - search every template of the frontend
rtk grep -rn 'bg-brand-500' apps/frontend/src/app

# If neither search finds the class, do not use it.
```

## Caution — the upstream repository holds an older generation

The upstream template and this project do not use the same class names. The
project runs Tailwind v4, and it defines its tokens in a `@theme` block. The
upstream template of the table below runs Tailwind v3, and it defines its tokens
in a `tailwind.config.js` file.

The proof: the class `boxdark` appears 0 times in `apps/frontend/src`. That class
is central to the upstream template.

Do not copy a class from the upstream repository into this project. Copy the
**structure** of the markup, and then map each class onto a token that
`apps/frontend/src/styles.css` defines.

## Source 4 — the upstream repository

Read it only when the first three sources hold no example. Prefix every command
with `rtk`, as the project requires.

| Item | Value |
|------|-------|
| **Repository** | https://github.com/TailAdmin/tailadmin-free-tailwind-dashboard-template |
| **Branch** | `main` |
| **Source Path** | `src/` |
| **CSS Config** | `tailwind.config.js` |
| **Custom CSS** | `src/css/style.css` |

```bash
# 1. Clone the repository, one time
rtk git clone --depth 1 https://github.com/TailAdmin/tailadmin-free-tailwind-dashboard-template.git /tmp/tailadmin

# 2. List the page templates
rtk ls /tmp/tailadmin/src/*.html

# 3. List the partials
rtk ls /tmp/tailadmin/src/partials/

# 4. Read the token definitions
rtk cat /tmp/tailadmin/tailwind.config.js
rtk cat /tmp/tailadmin/src/css/style.css
```

### Find a component in the upstream source

```bash
# Stat cards and dashboard blocks
rtk grep -A 50 'stat\|kpi\|metric' /tmp/tailadmin/src/index.html | head -80

# Tables
rtk head -200 /tmp/tailadmin/src/tables.html

# Forms
rtk head -200 /tmp/tailadmin/src/form-elements.html

# Buttons
rtk grep -B 5 -A 10 'btn\|button' /tmp/tailadmin/src/*.html | head -100

# Cards
rtk grep -B 5 -A 20 'rounded-sm border' /tmp/tailadmin/src/*.html | head -100

# Sidebar and header
rtk cat /tmp/tailadmin/src/partials/sidebar.html
rtk cat /tmp/tailadmin/src/partials/header.html

# Modals
rtk grep -B 5 -A 30 'modal' /tmp/tailadmin/src/*.html | head -100

# Alerts
rtk head -150 /tmp/tailadmin/src/alerts.html
```

### The file locations of the upstream source

| Component Type | Source File |
|---------------|-------------|
| Dashboard/Stats | `src/index.html` |
| Tables | `src/tables.html` |
| Forms | `src/form-elements.html` |
| Buttons | `src/buttons.html` |
| Alerts | `src/alerts.html` |
| Cards | `src/index.html` (search "rounded-sm border") |
| Modals | Various files (search "modal") |
| Sidebar | `src/partials/sidebar.html` |
| Header | `src/partials/header.html` |
| Charts | `src/chart-*.html` |
| Authentication | `src/signin.html`, `src/signup.html` |
| Profile | `src/profile.html` |
| Settings | `src/settings.html` |
