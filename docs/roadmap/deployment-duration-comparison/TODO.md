# The comparison of the duration of a deployment

The list of the deployments of a service does not tell whether our deployment process becomes faster or slower. Each successful entry gets a badge that compares its run with the run of the nearest older successful deployment: a green "X% faster" or a red "X% slower", with the formula `(previous - current) / previous`, rounded to a whole percent. The duration counts the run alone, from a new `startedAt` to `finishedAt`, and not the wait in the queue. An entry shows no badge if it is not `success`, if it has no `startedAt`, if no older successful deployment with a `startedAt` exists, if the previous duration is 0 s, or if the rounded change is 0%. Failed, pending, running and deleted deployments are never a reference, and the deployments that exist today stay without a badge. The pagination of the list and a threshold above 0% stay out of scope.

## Phase 1 — The start of the run in the backend

**Agent:** implementer
**Paths:** apps/backend/src/features/deployments/, iac/production/migrations/, packages/contracts/src/deployments/

- [x] 1.1 Add the nullable column `startedAt` to the deployment entity, with a migration that leaves the existing rows at null.
- [x] 1.2 Set `startedAt` when a deployment changes to the state `running`.
- [x] 1.3 Add the nullable field `startedAt` to the deployment contract and to its transformer.
- [x] 1.4 Cover 1.2 and 1.3 with unit tests, and pass `check-types` of `@gitpaas/backend`.

## Phase 2 — The badge in the frontend

**Agent:** implementer
**Paths:** apps/frontend/src/app/

- [x] 2.1 Write a pure function that gives the rounded change of each entry against the nearest older successful entry with a `startedAt`, or nothing when a rule of the introduction hides the badge.
- [x] 2.2 Show the badge in each entry of the deployment list, green with "X% faster" and red with "X% slower", in the style of the existing status badge.
- [x] 2.3 Cover every rule of the introduction with unit tests of the function, and pass `check-types` of `@gitpaas/frontend`.

## Phase 3 — The documentation

**Agent:** documenter
**This is the last phase.**

- [ ] 3.1 Write the badge, the measure of the run and the rules of the reference into `docs/business/deployments.md`.
- [ ] 3.2 Add `startedAt` to the pages of `docs/` that list the fields of a deployment.
- [ ] 3.3 Delete `docs/roadmap/deployment-duration-comparison/`, and its line in `docs/roadmap.md`.
