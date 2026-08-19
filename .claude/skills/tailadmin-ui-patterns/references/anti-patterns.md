# TailAdmin: Anti-Patterns and Verification Checklist

## Anti-Patterns: NEVER Do This

### ❌ Inventing Classes (CRITICAL VIOLATION)

```html
<!-- WRONG: These classes DON'T EXIST in TailAdmin -->
<div class="card-dashboard">         <!-- INVENTED - doesn't exist -->
<div class="tailadmin-header">       <!-- INVENTED - doesn't exist -->
<div class="custom-stat-box">        <!-- INVENTED - doesn't exist -->
<button class="btn-tailadmin">       <!-- INVENTED - doesn't exist -->
<div class="dashboard-widget">       <!-- INVENTED - doesn't exist -->
<div class="admin-card">             <!-- INVENTED - doesn't exist -->
```

**Verify ANY class before using:**
```bash
# If this returns nothing, the class DOES NOT EXIST
grep -r 'class-name' /tmp/tailadmin/src/
grep 'class-name' /tmp/tailadmin/tailwind.config.js
```

### ❌ Wrong Color Names

```html
<!-- WRONG: These color classes don't exist -->
<div class="bg-boxlight">        <!-- Doesn't exist - use bg-white or bg-whiter -->
<div class="text-bodylight">     <!-- Doesn't exist - use text-body -->
<div class="bg-meta-11">         <!-- Only meta-1 through meta-10 exist -->
<div class="bg-primary-light">   <!-- Doesn't exist -->
<div class="border-dark">        <!-- Doesn't exist - use border-strokedark -->
```

### ❌ Wrong Spacing Values

```html
<!-- WRONG: These spacing values don't exist -->
<div class="p-7.6">              <!-- Not defined - use p-7.5 -->
<div class="w-73">               <!-- Not defined - use w-72.5 -->
<div class="mt-5.7">             <!-- Not defined - use mt-5.5 or mt-6 -->
```

### ❌ Mixing Frameworks

```html
<!-- WRONG: Don't mix Bootstrap or other frameworks -->
<div class="card rounded-sm">           <!-- Bootstrap 'card' class -->
<button class="btn btn-primary">        <!-- Bootstrap button classes -->
<div class="container-fluid">           <!-- Bootstrap container -->
<div class="row">                       <!-- Bootstrap grid -->
```

### ✅ Correct Approach: Always Verify First

```bash
# BEFORE using any class:

# 1. Clone repo (first time only)
git clone --depth 1 https://github.com/TailAdmin/tailadmin-free-tailwind-dashboard-template.git /tmp/tailadmin

# 2. Search for the class
grep -r 'the-class-you-want' /tmp/tailadmin/src/

# 3. If found, copy the EXACT pattern from the source
# 4. If NOT found, find an alternative that DOES exist
```

## Verification Checklist Before Any UI Code

```
[ ] Cloned/updated TailAdmin repository to /tmp/tailadmin
[ ] Found example of component type in src/*.html or src/partials/
[ ] Verified ALL custom classes exist in tailwind.config.js
[ ] Copied EXACT HTML structure from source
[ ] Did NOT invent any new classes
[ ] Did NOT modify class names from source
[ ] Tested dark mode classes (dark:*) are correct
```
