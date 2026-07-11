---
name: backend-testing
description: Write the unit test layer for the Backend application (apps/backend) — Jest specs for use cases, services, repositories, and controllers. Use when adding or updating tests in the backend.
---

# Backend testing skill

The procedure and conventions for testing `apps/backend`. The runner is **Jest** (`ts-jest`), configured in `apps/backend/jest.config.js`.

## Where tests live

- One spec file per unit under test, in an **`__tests__/` folder adjacent to the code** it covers — e.g. `application/create-deployment.use-case.ts` → `application/__tests__/create-deployment.use-case.spec.ts`.
- The filename mirrors the subject and ends in **`.spec.ts`**. Jest's `testRegex` is `.*\.spec\.ts$`; a different suffix (`.test.ts`) is **not** picked up.
- Never add a spec to `tsconfig.build.json`'s scope — spec files are excluded from the production build and their globals come from the `jest` type in `tsconfig.json`.

## What to test, by layer

Test each layer in isolation, faking its collaborators. Do not stand up Nest, TypeORM, or Postgres in a unit test.

- **application (use cases)** — the primary target. Each use case is a pure function taking a repository port. Pass a mocked repository and assert it forwards the right arguments, returns the repository's result, and propagates errors. This is the highest-value, cheapest layer to cover.
- **ui/services** — assert the service delegates to the correct use case and threads arguments/results through. Mock the injected repository.
- **infrastructure/database repositories** — assert mapping between the DB entity and the domain model, and query construction. Mock the TypeORM `Repository`.
- **ui/controllers** — assert routing to the service and DTO/param passing. Mock the service.

Keep behavior-focused `it` descriptions that read as a contract (delegates…, returns…, propagates…).

## Mocking the repository port

Domain repositories are plain interfaces (ports), so mock them structurally with `jest.Mocked<T>` and `jest.fn()` per method — no NestJS testing module needed:

```ts
let repository: jest.Mocked<DeploymentsRepository>;

beforeEach(() => {
    repository = {
        getAllByService: jest.fn(),
        findById: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
    };
});
```

Reserve `@nestjs/testing` (`Test.createTestingModule`) for tests that genuinely need DI wiring (e.g. a controller resolved through the container). Prefer plain mocks otherwise — they are faster and clearer.

## Documenting a spec

Match the JSDoc density of the surrounding code:

Tests should contain very little documentation, as they should be self-explanatory. Add only very specific comments when necessary.

## Verify

- Run the affected app's tests: `pnpm --filter backend test` (narrow to one suite with `pnpm --filter backend test -- <name>`).
- Do **not** run ESLint — that is the user's responsibility.
