# The research of the complexity of the frontend

Scope: `apps/frontend/src` alone. No file of `apps/` changed. Measured against
`.claude/rules/agent-rules.md`, `docs/architecture/frontend/structure.md`,
`docs/architecture/frontend/conventions.md` and the pages of `docs/business/`.

## What the frontend does today, and where

`apps/frontend/src/app` holds 15 745 lines of `.ts` and `.html`, and roughly a third of them are
specs. It holds nine features, one shell, eighteen pages and eleven shared primitives.

### The bootstrap and the routes

`app.config.ts` registers the router with `withComponentInputBinding()` and the HTTP client with
`authInterceptor`. `app.ts` is a thin host with `<router-outlet />` and `<app-toast />`.
`app.routes.ts:5-139` gives the two documented tiers: `signin` behind `guestGuard`
(`app.routes.ts:6-11`), and the shell `''` behind `authGuard` (`app.routes.ts:12-134`) with every
page lazy. The deep nesting lives at `app.routes.ts:87-129` (`namespaces/:namespaceId/projects/…`
down to `:id/services/:serviceId/:tab`).

### The features and their layers

| The feature | Its layers today | Its lines (no spec) |
|---|---|---|
| `services` | `infrastructure/api` + `ui/{containers,components}` | ~1 100 |
| `providers` | `application`, `domain/constants`, `infrastructure/{api,github}`, `ui/{containers,components}` | ~1 000 |
| `server` | `application`, `domain/models`, `infrastructure/api`, `ui/{containers,components}` | ~700 |
| `projects`, `namespaces` | `infrastructure/api` + `ui/{containers,components}` | ~330 each |
| `authentication` | `infrastructure/{api,storage}` + `ui/{containers,guards,interceptors,services}` | ~450 |
| `deployments` | `infrastructure/api` alone (`deployments-api.repository.ts`, 223 lines) | 223 |
| `containers`, `networks` | `infrastructure/api` + one component each, no route | ~110 each |

Only `server` carries `domain/models/server-health.model.ts:1-37`. Every other feature types itself
from `@gitpaas/contracts`, which is the intended shape.

### The reads and the mutations

Every list and every detail is an `httpResource`, and every create/update/delete is an `HttpClient`
call that a container awaits with `lastValueFrom`. The four repositories that carry a collection hold
a mutable scoping signal — `projects-api.repository.ts:21`, `services-api.repository.ts:23` — and a
container writes it in an `effect` (`projects-list.component.ts:44-48`,
`service-detail.component.ts:114-118`).

### The state of the containers

Every list container holds the same four members: the resource, `pendingDelete`, `deleting` and the
computed `deleteMessage`. Every command container holds `submitting` and one `try/catch/finally`
around the awaited mutation. `signal(false)` appears 28 times across the application.

### The shell, the pages and the shared folder

`layout/ui/` holds the sidebar, the header, the backdrop, the theme toggle, the breadcrumb and the
widget. `SidebarService` keeps RxJS, which the conventions record as the one exception. The eighteen
pages are 14–44 lines, and **no page injects a service**. `shared/` holds eleven presentational
primitives, `ToastService` and `SafeHtmlPipe`.

### The dependencies

No import points from `domain/` to `infrastructure/` or to `ui/`, and no import points from
`shared/` or from `layout/` into a feature. The one rule of the dependencies holds.

## The findings

Ordered by the value that each one returns for the effort that it takes.

### 1. The sidebar carries a whole submenu engine that no navigation item uses

`layout/ui/components/sidebar/sidebar.component.ts:63-84` declares four flat `navItems`, and not one
of them holds `subItems`. Yet `sidebar.component.ts:86-90` (`openSubmenu`, `subMenuHeights`,
`@ViewChildren('subMenu')`), `:136-155` (`toggleSubmenu`, with `setTimeout`, `getElementById` and
`cdr.detectChanges`) and `:177-201` (`setActiveMenuFromRoute`) exist only for that case, together
with `sidebar.component.html:69-185`, the `@if (nav.subItems)` branch with its `pro` and `new`
badges. That is about 90 of 202 lines of the class and about 115 of 231 lines of the template.
The `ChangeDetectorRef`, the `combineLatest` subscription of `:115-122` and the `OnDestroy` exist to
serve the same dead branch.

- **The cost of keeping it**: the largest template of the application is more than half dead, and
  every reader of the shell pays for it. `docs/business/frontend-shell.md:25` states one rule for the
  sidebar and it names no submenu, so nothing proves this code.
- **The size of the change**: one file pair, mechanical deletion. No rule of the business changes.

### 2. The CRUD of `namespaces`, of `projects` and of `services` is one shape written three times

`namespaces-list.component.ts:22-83`, `projects-list.component.ts:22-91` and
`services-list.component.ts:22-93` differ only in the name of the entity and in the route of
`view`/`edit`. The templates `namespaces-list.component.html:1-43` and
`projects-list.component.html:1-43` differ in five words. The cards
`namespace-card.component.html:1-41` and `project-card.component.html:1-41` differ in the name of the
input and in the counted noun. The forms `namespace-form.component.html:1-26` and
`project-form.component.html:1-26` differ in the placeholder and in the return link. The add
containers `namespace-add.component.ts:20-45` and `project-add.component.ts:20-47` differ in the
signature of `create` and in the words of the toast.

- **The cost of keeping it**: a change to the pattern of the delete, of the empty state or of the
  Tailwind block of a card is three or four edits, and the copies already drift (`providers-list`
  carries a fifth variation at `providers-list.component.ts:120-147`).
- **The size of the change**: large, and it is the one place where over-engineering is a real risk. A
  shared `app-entity-card` in `shared/components/` and a shared confirm-and-delete helper are the
  narrow parts; a generic list container is the wide part.

### 3. Two containers live in `ui/components/` and inject a repository

`services/ui/components/deployment-logs-modal/deployment-logs-modal.component.ts:44` injects
`DeploymentsApiRepository`, opens an SSE subscription at `:114-157`, reads a second resource at
`:80` and holds seven signals. `services/ui/components/service-provider/service-provider.component.ts:32`
injects `ProvidersApiRepository`, provides it at `:24` and drives three chained resources at
`:51-68`.

- **The cost of keeping it**: the conventions state that a presentational component injects no
  service, so the folder no longer tells a reader what a file does, and the two heaviest units of the
  `services` feature hide in the folder that should hold the light ones.
- **The size of the change**: small. Move both folders to `ui/containers/`, correct the imports of
  `service-detail.component.ts:8` and `:12`. No behavior changes.

### 4. The route parameters enter the containers by two different roads

The convention says a container reads `input.required<string>()` and injects no `ActivatedRoute`.
Six containers break it: `service-add.component.ts:29,33,35`, `service-edit.component.ts:29,33,35,37`,
`provider-edit.component.ts:32,36`, `namespace-edit.component.ts:24,28`, and the two registration
returns `provider-registration-created.component.ts:25,45` and
`provider-registration-installed.component.ts:25,45`. The rest of the application uses inputs
(`projects-list.component.ts:29`, `service-detail.component.ts:60-66`).

- **The cost of keeping it**: a snapshot read is untestable without a router mock, and it hides the
  contract of the container. Half of the spec files of these containers exist to build that mock.
- **The size of the change**: small per file, six files. The pages already receive the parameters, so
  each fix is one input and one binding in the template of the page.

### 5. The breadcrumb sits in the page four times and in the container five times

`pages/projects/edit/project-edit.component.ts:20-24` builds the trail, and so do the other pages. But
`service-add.component.ts:9,16`, `service-edit.component.ts:9,16`,
`service-detail.component.ts:20,31,103-113`, `project-detail.component.ts:7,13` and
`server-overview.component.ts:8,17,33` build it inside the container.

- **The cost of keeping it**: a reader cannot say where a trail comes from without opening both
  files, and a container that owns a trail cannot be reused on another screen.
- **The size of the change**: small, five containers and five pages.

### 6. `server-maintenance` holds two jobs and a formatter

`server-maintenance.component.ts:52-253` runs the prune pipeline (`:57-81`, `:91-148`) and the removal
of the orphaned containers (`:83-89`, `:93`, `:153-183`) as two parallel copies of
request/confirm/run/toast. `formatBytes` at `:242-252` and `summarize` at `:227-233` are pure
functions in a class, and the `server` feature already owns an `application/` folder for exactly that
(`map-daemon-health.use-case.ts`). The file has **no spec**, which makes it the largest untested unit
of the frontend.

- **The cost of keeping it**: 254 lines in the layer that should be the thinnest, and no test.
- **The size of the change**: medium. Move `formatBytes` and the two `summarize` functions into
  `features/server/application/`, and fold the orphan action into the list of the actions.

### 7. The shared button carries a dead icon API that forces an HTML bypass

`shared/components/button/button.component.ts:25-27` declares `startIcon` and `endIcon` as raw HTML
strings, and `button.component.html:16-22` renders them through `[innerHTML]="icon | safeHtml"`.
**No caller anywhere passes either input** — a grep of every template returns only the two lines of
the button itself. `SafeHtmlPipe` (`shared/pipes/safe-html.pipe.ts`) exists for that one use, and it
calls `bypassSecurityTrustHtml`. The conventions say to use the per-icon components of
`@lucide/angular`, which the rest of the application does.

- **The cost of keeping it**: a live `innerHTML` bypass with no caller, and a pipe that only serves
  it.
- **The size of the change**: very small. Delete two inputs, two template blocks and one pipe.

### 8. Two shared primitives still use the decorator `@Output()`

`shared/components/input/input-field.component.ts:38` and
`shared/components/button/button.component.ts:29` declare `new EventEmitter<…>()` with `@Output()`.
Every other component of the application uses `output()`. No `@Input()` decorator remains anywhere.

- **The cost of keeping it**: two files that contradict the rule the other sixty obey.
- **The size of the change**: two lines each.

### 9. The shell uses `CommonModule` and `ngClass`, which the conventions forbid

`sidebar.component.ts:1,40` with `sidebar.component.html:21,33,55,75,101,112,142,152,167,191,195`;
`layout.component.ts:1,13` with `layout.component.html:9`; `backdrop.ts:1,12`; `theme-toggle.ts:1,12`;
`header.ts:1,16`. The last three also break the naming rule: they are `backdrop.ts`, `header.ts` and
`theme-toggle.ts`, and not `<name>.component.ts`.

- **The cost of keeping it**: `CommonModule` pulls the whole module into three components that use no
  directive of it, and the file names break the one convention that a tool could check.
- **The size of the change**: small, five files, mechanical.

### 10. Three shared items serve one caller each

`shared/components/modal/` is imported only by `deployment-logs-modal.component.ts:8`.
`shared/components/select2/` is imported only by `service-provider.component.ts:9`.
`shared/pipes/safe-html.pipe.ts` is imported only by `button.component.ts:3` (see finding 7).

- **The cost of keeping it**: `shared/` claims to hold what many features use, and a third of it does
  not. A reader trusts the folder less.
- **The size of the change**: small if the answer is to move them into `services`; zero if the answer
  is that a modal and a select are primitives that the next screen will use. This is a question for
  the user, not a defect.

### 11. `pages/dashboard` holds dead placeholder data

`pages/dashboard/dashboard.component.ts:3-13` declares two interfaces, and `:23-43` declares `stats`
and `usage`, which the template never reads.

- **The cost of keeping it**: 40 dead lines on the first screen a reader opens.
- **The size of the change**: very small — but see the section of the decisions, because
  `docs/business/frontend-dashboard.md` describes these arrays in words.

### 12. Two registration containers re-check the authentication that the guard already checked

`provider-registration-created.component.ts:39-43` and
`provider-registration-installed.component.ts:39-43` redirect to `/signin` when `auth.isAuthenticated()`
is false. Both routes are children of the shell route at `app.routes.ts:12-14`, which `authGuard`
already protects, and `auth.guard.ts:14-23` performs the same redirect with the same `returnUrl`.
**Hypothesis, not a confirmed defect**: the guard reads `TokenStorageService.accessToken()` and
`AuthService.isAuthenticated()` may read a different fact. It needs one reading of
`auth.service.ts` before anyone deletes it.

- **The cost of keeping it**: a second, weaker copy of the rule of the access.
- **The size of the change**: five lines in each file, once the question is answered.

### 13. The tab shell is written twice

`server-overview.component.ts:38-60` and `service-detail.component.ts:88-101,168-171` hold the same
three parts: the list of the tabs, the `activeTab` computed that falls back to the first tab, and the
`changeTab` that navigates. Only the array of the routes differs.

- **The cost of keeping it**: small today, and it grows with the third tabbed screen.
- **The size of the change**: small, and it may not be worth it at two copies.

### 14. `shared/` has no test at all

Every one of the eleven components of `shared/components/`, `ToastService` and `SafeHtmlPipe` has no
spec. `server-maintenance.component.ts` (254 lines) and `server-health.component.ts` have none
either. The features themselves are well covered: 30 spec files, and several of 200–390 lines.

- **The cost of keeping it**: the primitives that every screen depends on are the untested part.
- **The size of the change**: medium, and it is additive, so it carries no risk to the behavior.

### The strengths, which the plan must not undo

- The one rule of the dependencies holds everywhere. No `domain/` imports outward.
- No page injects a service. The eighteen pages are 14 to 44 lines.
- `features/server` is the reference of a clean feature: pure use cases in `application/`, a client
  model in `domain/models/`, and a container of 55 lines that only composes them
  (`server-health.component.ts:22-55`).
- The rule of the read and of the mutation holds in every repository, with the two exceptions below.
- `deployments-api.repository.ts:198-205` is the only place that validates an answer, and it uses the
  schema of `@gitpaas/contracts` and never a cast, exactly as the conventions ask.

### The two deviations of the reads and the mutations

- `authentication-api.repository.ts:56` reads `/me` with `http.get<User>` and not with
  `httpResource`. `AuthService` needs the answer once, imperatively, at the sign-in.
- `deployments-api.repository.ts:124` opens the SSE stream with the global `fetch` and not with
  `HttpClient`, and therefore rebuilds the `Authorization` header by hand at `:115-121` and imports
  `TokenStorageService` at `:13`. The conventions allow a long-lived stream to return an `Observable`;
  they do not describe a transport that steps around the interceptor.

## The rules of the business that this work touches

No refactor above changes a `SHALL`. Two pages describe the code in words, and a deletion would make
a sentence of the description false while every `SHALL` stays true:

- `docs/business/frontend-dashboard.md`, the rule "The dashboard holds no content yet". The `SHALL`
  says the screen shows the word "Dashboard" and calls no endpoint, and finding 11 leaves that true.
  The paragraph below it says "The component declares a set of numbers and a set of names of
  services", and finding 11 makes that sentence false.
- `docs/business/frontend-shell.md`, the rule "The sidebar of the navigation". It names the wide and
  the narrow states and no submenu, so finding 1 leaves it true in full.

Every other page (`namespaces`, `projects`, `services`, `providers`, `server`, `logs`, `auth`) keeps
each `SHALL` and each scenario unchanged, because no finding changes what a screen does.

## The options and their cost

### Option A — The deletions and the moves alone

Findings 1, 3, 5, 7, 8, 9, 11, 12. Every one is a deletion, a move or a rename, and none invents an
abstraction.

- It removes roughly 250 lines and it closes every rule of the conventions that the code breaks
  today.
- It touches about 20 files and it needs almost no new test, because the deleted code has none.
- It does not touch the triplicated CRUD, which is the largest cost of the frontend.

### Option B — Option A, and the narrow shared primitives

Option A, and then finding 2 taken at its narrow end alone: one `app-entity-card` in
`shared/components/`, one shared block of the empty state, and the pure functions of finding 6 moved
into `features/server/application/`.

- It removes roughly 400 lines, and it leaves each feature with its own container and its own route,
  so no feature loses its independence.
- It rewrites four card components and three list templates, and each one needs its spec adjusted.
- It leaves the three list containers as three copies of the same 60 lines.

### Option C — Option B, and one generic list container

Option B, and a generic base for the list container and for the add/edit container, parameterised by
the entity, by the repository and by the routes.

- It removes roughly 700 lines and it makes the fourth entity nearly free to add.
- It builds the abstraction that the limits of `TODO.md` warn about: a generic container hides the
  route of each feature behind a parameter, the `providers` list already needs a fifth behavior
  (`providers-list.component.ts:96-106`), and the next feature that differs pays the cost of leaving
  the base.
- It rewrites nine containers and their nine spec files, which are the best-covered part of the
  application.

## What the user must decide

1. Does the plan take option A, B or C? The limit "no over-engineering" of `TODO.md` points at A or B.
2. May a refactor edit `docs/business/frontend-dashboard.md` to delete the paragraph that describes
   the dead `stats` and `usage`, given that the `SHALL` of that page stays true?
3. Do `shared/components/modal/` and `shared/components/select2/` stay in `shared/` with one caller
   each, or do they move into `features/services/`?
4. Does `application/` become a documented layer of a feature of the frontend? `providers` and
   `server` already use it, and `docs/architecture/frontend/structure.md:21-33` names three layers
   alone.
5. Do the routes of a feature move into the feature (`features/<f>/<f>.routes.ts`), or does
   `app.routes.ts` stay the one map of the application? The structure page describes the single file
   as the intent today, so a move is a change of the documented architecture.
6. Is the auth re-check of finding 12 dead, or does `AuthService.isAuthenticated()` know a fact that
   `authGuard` does not?
7. Should the SSE stream of `deployments-api.repository.ts:124` keep its own `fetch`, or should the
   plan pull the transport behind `HttpClient` so the interceptor carries the token?
8. Does the plan add the missing specs of `shared/` and of `server-maintenance`, or does that take
   its own folder of the roadmap?
