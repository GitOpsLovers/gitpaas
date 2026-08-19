# TailAdmin: Fetch and Verify

## Repository Reference

| Item | Value |
|------|-------|
| **Repository** | https://github.com/TailAdmin/tailadmin-free-tailwind-dashboard-template |
| **Branch** | `main` |
| **Source Path** | `src/` |
| **CSS Config** | `tailwind.config.js` |
| **Custom CSS** | `src/css/style.css` |

## Mandatory Fetch Commands

**Before implementing ANY TailAdmin UI, run these commands:**

```bash
# 1. Clone repository (if not already done)
git clone --depth 1 https://github.com/TailAdmin/tailadmin-free-tailwind-dashboard-template.git /tmp/tailadmin 2>/dev/null

# 2. Check available page templates
ls /tmp/tailadmin/src/*.html

# 3. Check partials (reusable components)
ls /tmp/tailadmin/src/partials/

# 4. View Tailwind config for custom classes
cat /tmp/tailadmin/tailwind.config.js

# 5. View custom CSS definitions
cat /tmp/tailadmin/src/css/style.css
```

## Finding Specific Components

```bash
# Find dashboard/stats card patterns
grep -A 50 'stat\|kpi\|metric' /tmp/tailadmin/src/index.html | head -80

# Find table patterns
cat /tmp/tailadmin/src/tables.html | head -200

# Find form patterns  
cat /tmp/tailadmin/src/form-elements.html | head -200

# Find button patterns
grep -B 5 -A 10 'btn\|button' /tmp/tailadmin/src/*.html | head -100

# Find card patterns
grep -B 5 -A 20 'rounded-sm border' /tmp/tailadmin/src/*.html | head -100

# Find sidebar patterns
cat /tmp/tailadmin/src/partials/sidebar.html

# Find header patterns
cat /tmp/tailadmin/src/partials/header.html

# Find modal patterns
grep -B 5 -A 30 'modal' /tmp/tailadmin/src/*.html | head -100

# Find alert patterns
cat /tmp/tailadmin/src/alerts.html | head -150

# Search for ANY specific class
grep -r 'class-name-here' /tmp/tailadmin/src/
```

## Class Verification Process

**Before using ANY class, verify it exists:**

```bash
# Step 1: Search in HTML files
grep -r 'bg-boxdark' /tmp/tailadmin/src/ | head -5

# Step 2: Search in Tailwind config (for custom classes)
grep 'boxdark' /tmp/tailadmin/tailwind.config.js

# Step 3: Search in custom CSS
grep 'boxdark' /tmp/tailadmin/src/css/style.css

# If class not found in ANY of these = DO NOT USE IT
```

## Quick Reference: File Locations

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
