# ui-improvements

A card of a project and a card of a service show the name alone, so a user cannot tell what the record is about, when it was born, or whether it runs. The record of a project and the record of a service take a field `description` and a field `createdAt`, the two forms hold the description, the two cards show the description and the date, and the card of a service shows a bullet of color that reports the live state of its containers. The main title of every page takes the icon of its section. A persisted column of status, and any change of the runner of the deployment, stay out of scope.

## Phase 1 — The two fields in the backend

**Agent:** implementer
**Paths:** apps/backend/src/features/projects/, apps/backend/src/features/services/, packages/contracts/src/, iac/production/migrations/

- [x] 1.1 Add the column `description` (`text NOT NULL DEFAULT ''`) and the column `createdAt` (`timestamptz NOT NULL DEFAULT now()`) to `db-project.entity.ts` and to `db-service.entity.ts`.
- [x] 1.2 Add the two fields to `project.models.ts` and to `service.models.ts`, and map them in `db-projects.transformer.ts` and in `db-services.transformer.ts`.
- [x] 1.3 Add `description` (string) and `createdAt` (`z.iso.datetime()`) to `projectSchema` and to `serviceSchema`, and add `description` to the schemas of the creation and of the edition of the two features.
- [x] 1.4 Write a transformer of the response for the two features, which turns the `Date` of `createdAt` into a string ISO, as `provider-response.transformer.ts:20` does, and call it from the two controllers.
- [x] 1.5 Write the file `iac/production/migrations/018_*.sql`, idempotent, with the four columns, their types, their defaults and the names of the constraints that TypeORM produces.
- [x] 1.6 Update the unit tests of the two features, then run `rtk pnpm run check-types --filter @gitpaas/backend` and the unit tests of the backend, and make them pass.

## Phase 2 — The description and the date in the frontend

**Agent:** implementer
**Paths:** apps/frontend/src/app/features/projects/, apps/frontend/src/app/features/services/

- [x] 2.1 Change the output `save` of `project-form.component.ts` and of `service-form.component.ts` from `output<string>()` into an output of an object that holds the name and the description, and update the four containers `project-add`, `project-edit`, `service-add` and `service-edit`.
- [x] 2.2 Add a field `description` to the two forms, with a `<textarea>` and a limit of 500 characters, as `provider-form.component.html` does. The field is optional, and its empty value is the empty string.
- [x] 2.3 Show the description in `project-card` and in `service-card`, truncated after two lines. Show nothing when the description is the empty string.
- [x] 2.4 Show the date of creation in the two cards, with the format `{{ x.createdAt | date: 'yyyy-MM-dd' }}`.
- [x] 2.5 Update the unit tests of the four components and of the four containers, then run `rtk pnpm run check-types --filter @gitpaas/frontend` and the unit tests of the frontend, and make them pass.

## Phase 3 — The bullet of the state of a service

**Agent:** implementer
**Paths:** apps/frontend/src/app/features/services/

- [x] 3.1 Give `service-card` an input of a state that holds one of the four values `ok`, `warning`, `error` and `unknown`, and show a bullet in the upper-right corner of the card: green, yellow, red and gray.
- [x] 3.2 In the container of the list of the services, read `GET /containers?serviceId=` one time for each service of the list, and compute the state: `running` gives `ok`; `paused` and `restarting` give `warning`; `exited` and `dead` give `error`.
- [x] 3.3 When the service holds no container, read `GET /deployments?serviceId=` for that service alone. A service without a deployment gives `unknown`, and a service with one gives `error`.
- [x] 3.4 Write the unit tests of the bullet and of the computation of the state, then run `rtk pnpm run check-types --filter @gitpaas/frontend` and the unit tests of the frontend, and make them pass.

## Phase 4 — The icon of the main title

**Agent:** implementer
**Paths:** apps/frontend/src/app/layout/ui/components/breadcrumb/, apps/frontend/src/app/features/, apps/frontend/src/app/pages/

- [x] 4.1 Give `BreadcrumbComponent` an optional input `icon` that takes a component of Lucide, and render it before the `<h2>` of the title.
- [x] 4.2 Pass the icon in the 17 templates that use the breadcrumb. A project takes `folder`, a service takes `layers`, and the other sections take the icon that `sidebar.component.html` already shows.
- [x] 4.3 Show the title of the page of the dashboard with `BreadcrumbComponent` and the icon `grid`, because that page uses no breadcrumb today.
- [x] 4.4 Update the unit tests of the breadcrumb, then run `rtk pnpm run check-types --filter @gitpaas/frontend` and the unit tests of the frontend, and make them pass.

## Phase 5 — The documentation

**Agent:** documenter
**Paths:** docs/business/
**This is the last phase.**

- [ ] 5.1 Write the two new fields into `docs/business/projects.md` and `docs/business/services.md`, and correct every sentence that states that the record holds four things, and that the form holds one field.
- [ ] 5.2 Write into `docs/business/services.md` the bullet of the state, its four colors and its source of data.
- [ ] 5.3 Write into `docs/business/frontend-shell.md` the rule of the icon of the main title.
- [ ] 5.4 Delete the folder `docs/roadmap/ui-improvements/`, and its line of `docs/roadmap.md`.
