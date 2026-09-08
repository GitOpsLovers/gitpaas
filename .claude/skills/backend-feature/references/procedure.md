# The procedure that adds or changes a resource of the backend

## Before you write

- Invoke `backend-architecture`. Its pages hold every rule of the layers, of the naming and of the wiring, and each rule wins over this file.
- Open the sibling feature that resembles your resource, and copy its layout. `features/projects/` is the example of a resource of the database. `features/networks/` is the example of a resource that holds two technologies at one layer.
- Decide the owner of each new file: the feature, `core/` or `shared/`.
- List the files of each layer before you write one of them.

## The order of the steps

1. **The contract.** Write the schemas of Zod of the wire and their types in `packages/contracts/src/<area>/<name>.contract.ts`. Export each schema and each type in `packages/contracts/src/index.ts`. Add the spec in `packages/contracts/src/<area>/__tests__/<name>.contract.spec.ts`.
2. **The domain.** Write the models, the ports (`repositories/` and `ports/`), the errors, and the internal DTOs of `domain/dtos/`.
3. **The infrastructure.** Write the entity of the ORM, one adapter for one port, and the transformer beside the adapter. One sub-folder holds one technology.
4. **The application.** Write one file for one use case. A use case is a pure function, and it takes its collaborators before its data.
5. **The UI.** Write the controller, the service and the transformer of the answer. Add a guard, a job or a folder of telemetry only if the resource needs one.
6. **The module of the feature.** Declare the controllers, the services and the concrete adapters. Export the provider that another feature injects.
7. **The wiring outside of the feature.**
   - `apps/backend/src/app.module.ts` — add the module to `imports`.
   - `apps/backend/src/core/ui/translators/http-error.translator.ts` — add one row for one new code of a domain error.
   - `iac/production/migrations/<nnn>_<name>.sql` — write the same change of the schema by hand.
8. **The specs.** Write one `__tests__/<name>.spec.ts` file beside each file that you wrote. `backend-unit-testing` holds the conventions.
9. **Verify.** Apply the rule of the verification of `CLAUDE.md` to `@gitpaas/backend`.

## A change to an existing resource

The order stays the same, and you use the steps that your change needs. A new field of the wire touches five files together: the contract, the model of the domain, the entity, the two transformers, and the migration. A new error of the domain always takes its row of step 7.
