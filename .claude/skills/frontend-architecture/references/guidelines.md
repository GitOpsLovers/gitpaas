# The guidelines of Angular

The pages of `docs/architecture/frontend/` hold the layers, the naming and the path aliases of this
project, and they win over this file. Read this file for the rules of the framework that no page of
the project covers.

## The rules

1. `apps/frontend` runs Angular 22. Never apply a practice of an older major version.
2. Follow the style guide of Angular for the maintainability and for the performance.
3. Write a new form with the signal forms. See [signal-forms.md](signal-forms.md).
4. Change a form that exists with the API that the form already uses.
5. Verify a change with `rtk pnpm run check-types --filter @gitpaas/frontend`. Never run `ng build`
   directly, and never create a project with `ng new`.
