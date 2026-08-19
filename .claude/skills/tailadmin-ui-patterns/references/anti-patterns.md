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
# If both searches return nothing, the class DOES NOT EXIST
rtk grep -n 'class-name' apps/frontend/src/styles.css
rtk grep -rn 'class-name' apps/frontend/src/app
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

# 1. Search the theme file for the token
rtk grep -n 'the-class-you-want' apps/frontend/src/styles.css

# 2. Search the templates for a component that already uses it
rtk grep -rn 'the-class-you-want' apps/frontend/src/app

# 3. If found, copy the EXACT pattern from that template
# 4. If NOT found, find an alternative that DOES exist
```

## Verification Checklist Before Any UI Code

```
[ ] Found an example of the component type under apps/frontend/src/app
[ ] Verified ALL custom classes in apps/frontend/src/styles.css
[ ] Copied the EXACT markup structure from that example
[ ] Did NOT invent any new classes
[ ] Did NOT copy a class name from the older upstream template
[ ] Tested dark mode classes (dark:*) are correct
```
