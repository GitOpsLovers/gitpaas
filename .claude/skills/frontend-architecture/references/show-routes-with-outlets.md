# Show Routes with Outlets

The `RouterOutlet` directive is a placeholder where Angular renders the component for the current URL.

## Basic Usage

Include `<router-outlet />` in your template. Angular inserts the routed component as a sibling immediately following the outlet.

```html
<app-header /> <router-outlet />
<!-- Route content appears here -->
<app-footer />
```

## Nested Outlets

Child routes require their own `<router-outlet />` within the parent component's template.

```ts
// Parent component template
<h1>Settings</h1>
<router-outlet /> <!-- Child components like Profile or Security render here -->
```

## Outlet Lifecycle Events

`RouterOutlet` emits events when components are changed:

- `activate`: New component instantiated.
- `deactivate`: Component destroyed.
- `attach` / `detach`: Used with `RouteReuseStrategy`.

```html
<router-outlet (activate)="onActivate($event)" />
```
