# The components of the frontend, and the two rules

1. **Reuse the component before you write markup.** Every panel, table, form and dialog of GitPaaS
   is already a component of `apps/frontend/src/app/shared/components/`. Compose one; do not rebuild
   it out of utilities.
2. **Never invent a class.** Verify it two ways, and if neither search finds it, the class is not of
   this design system.

```bash
rtk grep -n 'brand-500' apps/frontend/src/styles.css
rtk grep -rn 'bg-brand-500' apps/frontend/src/app --include='*.html' --include='*.ts'
```

`--include='*.ts'` is not optional: 16 components hold the class string in the file `.ts` and not in
the template, for example `apps/frontend/src/app/shared/components/button/button.component.ts:24-47`.
A class that lives only in a file `.ts` is a class of the system. The rule on the accessor
`get …Classes()` that holds those strings belongs to
`.claude/skills/frontend-architecture/references/arch-known-deviations.md:9`.

## The address of each component

Every path is under `apps/frontend/src/app/`.

| You build | The component to use | Its path |
|---|---|---|
| A panel of a screen — the title, the description, the slot `[card-action]`, the body | `app-component-card`, 28 uses | `shared/components/component-card/` |
| An error or an informative note | `app-alert`, of the variants `error` and `info`; 18 files call it | `shared/components/alert/` |
| A dialog | `app-modal`, and `app-confirm-modal` for a destructive action, 10 uses | `shared/components/modal/`, `shared/components/confirm-modal/` |
| A form | `app-label`, `app-input-field`, `app-textarea-field`, `app-select2`, `app-button` | `shared/components/` — `label/`, `input/`, `textarea/`, `select2/`, `button/` |
| An icon | The directives of `@lucide/angular`, imported one by one, in 48 components | — |

The skin of the alert lives in its variant; its layout classes travel through the input `className`,
as `features/docker/ui/components/docker-images-table/docker-images-table.component.html:8` shows.

A form lives in a component `*-form`, never in a container.
`features/projects/ui/components/project-form/project-form.component.html` gives its shape: an
`app-component-card`, a `<form class="space-y-6">`, and the primitives inside.

## The shape of a table

Ten templates repeat one shape — the four of `features/docker/ui/components/docker-*-table/`, and
`service-domains`, `service-networks`, `service-volumes`, `service-containers`, `service-variables`,
`project-networks`. Copy it from
`features/docker/ui/components/docker-images-table/docker-images-table.component.html:12-51`:

- `<div class="overflow-x-auto">` wraps `<table class="min-w-full text-left text-sm">`.
- The row of the head: `border-b border-gray-100 text-xs uppercase tracking-wide text-gray-400 dark:border-gray-800`.
- The body: `divide-y divide-gray-100 dark:divide-gray-800`, and each cell `px-4 py-3`.
- While it loads, each row holds one `<app-skeleton variant="row" />`.

## The triad of a screen

A screen that loads data holds three branches, and
`features/projects/ui/containers/projects-list/projects-list.component.html` gives them:

- `@if` it loads — `app-skeleton`, of the variant `card` or `row`.
- `@else if` it failed — `<app-alert variant="error" className="flex min-h-40 items-center">`.
- `@else` it is empty — the dashed border: `flex min-h-40 flex-col items-center justify-center
  rounded-xl border border-dashed border-gray-300 p-8 text-center dark:border-gray-700`.
