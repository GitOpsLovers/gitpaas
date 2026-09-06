# compose-interpolation

GitPaaS substitutes no variable in the compose file of the user. A reference `${VAR}` reaches Docker as literal text, so a value of the section "Environments" never arrives at a `build.arg`, and the image carries the text `${VAR}`.

GitPaaS interpolates the whole recipe with the variables of the service, before it builds the images. An undefined variable gives an empty text, `${VAR:-default}` and `${VAR-default}` give the default, and `$$` gives one literal `$`.

The variables keep their one source, the section "Environments" of the service. A file `.env` of the repository takes no part.

## Phase 1 — The interpolation of the recipe

**Agent:** implementer
**Paths:** apps/backend/src/features/deployments/infrastructure/docker/

- [x] 1.1 Create the file `compose-interpolation.ts` with the exported function `interpolateRecipe(recipe, variables)`. It returns a new recipe, and it changes no input.
- [x] 1.2 Walk every text of the recipe — a key, a value, an item of a list, and every depth of a map. Substitute `${VAR}`, `$VAR`, `${VAR:-default}` and `${VAR-default}`, and turn `$$` into one `$`.
- [x] 1.3 Give an empty text to a variable that the map does not hold, and to `${VAR}` alone. Log no error, and stop no deployment.
- [x] 1.4 In `docker-executor.adapter.ts`, call `interpolateRecipe` on the recipe of the compose project between the line 97 and the line 103, so the substitution happens before `buildServices`.
- [x] 1.5 Keep `injectEnvironment` at its line 127 as it is. The interpolation adds no variable to the block `environment` of a service.
- [x] 1.6 Add `compose-interpolation.spec.ts` to `__tests__/`. Cover the four forms of the reference, the escape `$$`, the undefined variable, the nested map, the list, and a `build.args` that holds a reference.
- [x] 1.7 Add one test to `docker-executor.adapter.spec.ts` that proves the interpolation runs before the build of the images.

## Phase 2 — The documentation of the behavior

**Agent:** documenter
**Paths:** docs/business/, docs/roadmap/
**This is the last phase.**

- [ ] 2.1 Write the rule of the interpolation into `docs/business/service-environment.md`: the source of the values, the four forms of the reference, the escape `$$`, and the empty text of an undefined variable.
- [ ] 2.2 Add to `docs/business/deployments.md` the paragraph that states the moment of the interpolation, before the build, so a `build.arg` reads a variable of the service.
- [ ] 2.3 State in the same paragraph that a file `.env` of the repository takes no part.
- [ ] 2.4 Delete the folder `docs/roadmap/compose-interpolation/`, and delete its line of `docs/roadmap.md`.
