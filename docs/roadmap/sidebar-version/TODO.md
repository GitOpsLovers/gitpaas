# sidebar-version

The sidebar of the frontend shows no version, so a user cannot tell which release of GitPaaS runs, and an administrator learns of a new release only inside the tab Maintenance of the server. The bottom of the sidebar shows the installed version, and, when a newer release exists, a button that carries the administrator to `/server/maintenance`. The block is admin-only, because the endpoint that carries the data is admin-only. The check happens one time for each load of the page, and no timer refreshes it. The move of the panel of the update to another tab stays out of scope.

## Phase 1 — The block of the version in the sidebar

**Agent:** implementer
**Paths:** apps/frontend/src/app/layout/ui/components/sidebar/

- [x] 1.1 Rename the component `sidebar-widget` into `sidebar-version`, with its folder, its class, its selector and its files of test, and update the template of `sidebar.component.html` that renders it.
- [x] 1.2 Give `SidebarVersionComponent` the repository `ServerApiRepository` in its own array `providers`, and read `updateStatus()` one time when the component starts.
- [x] 1.3 Show the block only when the role of the current user is `admin`, with the same check that `server-maintenance.component.ts` uses.
- [x] 1.4 Show the text of `installedVersion` at the bottom of the sidebar, and show it only when the sidebar is expanded, hovered or open on mobile, as the old widget was.
- [x] 1.5 Show a button with the label `Update to <latestVersion>` when the field `update` is true, and hide it when the field is false. The button navigates to `/server/maintenance`.
- [x] 1.6 Write the unit tests of `SidebarVersionComponent`: the non-admin user, the admin user without an update, and the admin user with an update.
- [x] 1.7 Run `rtk pnpm run check-types --filter @gitpaas/frontend` and the unit tests of the frontend, and make them pass.

## Phase 2 — The documentation

**Agent:** documenter
**Paths:** docs/business/
**This is the last phase.**

- [ ] 2.1 Write the new behavior of the sidebar into `docs/business/frontend-shell.md`: the version, the condition of the administrator, the condition of the expanded sidebar, and the button that goes to the tab Maintenance.
- [ ] 2.2 Add to `docs/business/server.md` the sentence that the sidebar is the second place that announces a new release, and that the tab Maintenance stays the one place that runs the update.
- [ ] 2.3 Delete the folder `docs/roadmap/sidebar-version/`, and its line of `docs/roadmap.md`.
