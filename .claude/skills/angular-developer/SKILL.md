---
name: angular-developer
description: Angular API reference - signals, forms, DI, routing, SSR, testing. The skill frontend-architecture wins over it.
---

# Angular

The general documentation of the framework. `frontend-architecture` holds the layers, the naming and the path aliases of this project, and it wins over this skill. Read this skill for the API of Angular that no page of `docs/architecture/frontend/` covers.

## The reference files

| The file | Read it when |
| --- | --- |
| [guidelines.md](references/guidelines.md) | You start a task of Angular, or you create a project, or you choose the kind of form. |
| [components.md](references/components.md) | You write a component: its anatomy, its metadata, or the control flow of its template. |
| [inputs.md](references/inputs.md) | You declare an input of a signal, a transform, or a model. |
| [outputs.md](references/outputs.md) | You declare an output of a signal, or a custom event. |
| [host-elements.md](references/host-elements.md) | You bind the host element, or you inject an attribute. |
| [signals-overview.md](references/signals-overview.md) | You need `signal`, `computed`, a reactive context, or `untracked`. |
| [linked-signal.md](references/linked-signal.md) | You need a writable state that follows a source signal. |
| [resource.md](references/resource.md) | You read asynchronous data into the state of a signal. |
| [effects.md](references/effects.md) | You need `effect` or `afterRenderEffect`, or you must know when not to use one. |
| [signal-forms.md](references/signal-forms.md) | You write a form of signals. Prefer it in a new form of v21 or newer. |
| [reactive-forms.md](references/reactive-forms.md) | You write a reactive form, or you change one. |
| [template-driven-forms.md](references/template-driven-forms.md) | You write a simple form driven by the template. |
| [di-fundamentals.md](references/di-fundamentals.md) | You need the injection, a service, or the function `inject()`. |
| [creating-services.md](references/creating-services.md) | You create a service, or you use `providedIn: 'root'`. |
| [defining-providers.md](references/defining-providers.md) | You need `useClass`, `useValue`, `useFactory`, or a scope. |
| [injection-context.md](references/injection-context.md) | You call `inject()` outside a constructor, or you need `runInInjectionContext`. |
| [hierarchical-injectors.md](references/hierarchical-injectors.md) | You need the rules of the resolution, `optional`, `skipSelf`, or `viewProviders`. |
| [angular-aria.md](references/angular-aria.md) | You build an accordion, a listbox, a combobox, a menu, a tab, a toolbar, a tree or a grid. |
| [define-routes.md](references/define-routes.md) | You declare a path, a dynamic segment, a wildcard or a redirection. |
| [loading-strategies.md](references/loading-strategies.md) | You choose between the eager loading and the lazy loading of a route. |
| [show-routes-with-outlets.md](references/show-routes-with-outlets.md) | You place `<router-outlet>`, or you nest one, or you name one. |
| [navigate-to-routes.md](references/navigate-to-routes.md) | You navigate with `RouterLink`, or with the service `Router`. |
| [route-guards.md](references/route-guards.md) | You write `CanActivate`, `CanMatch` or another guard. |
| [data-resolvers.md](references/data-resolvers.md) | You read the data before the route activates, with `ResolveFn`. |
| [router-lifecycle.md](references/router-lifecycle.md) | You need the order of the events of a navigation, or you debug one. |
| [rendering-strategies.md](references/rendering-strategies.md) | You need the rendering of the client, the prerendering, or the SSR with the hydration. |
| [route-animations.md](references/route-animations.md) | You animate a transition of a route with the API of the view transitions. |
| [tailwind-css.md](references/tailwind-css.md) | You integrate Tailwind CSS into an application of Angular. |
| [angular-animations.md](references/angular-animations.md) | You animate with the native CSS, or with the old DSL. |
| [component-styling.md](references/component-styling.md) | You write the styles of a component, or you need the encapsulation. |
| [testing-fundamentals.md](references/testing-fundamentals.md) | You need `TestBed`, or an asynchronous pattern of a spec. |
| [component-harnesses.md](references/component-harnesses.md) | You drive a component from a spec with a harness. |
| [router-testing.md](references/router-testing.md) | You test a navigation with `RouterTestingHarness`. |
| [e2e-testing.md](references/e2e-testing.md) | You need the E2E. This project never runs it; see `CLAUDE.md`. |
| [cli.md](references/cli.md) | You run the CLI to generate, to serve or to build. |
| [migrations.md](references/migrations.md) | You refactor to a modern standard with a migration. |
| [mcp.md](references/mcp.md) | You need the server MCP of Angular, its tools or its configuration. |
| [environment-configuration.md](references/environment-configuration.md) | You configure the application at the build or at the runtime. |

Read one reference file for your task. Do not read the whole folder.
