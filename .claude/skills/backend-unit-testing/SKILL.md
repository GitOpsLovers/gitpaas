---
name: backend-unit-testing
description: Enable this skill when the user requests to work with the testing layer of the backend application.
---

# Backend unit testing skill

Conventions for `apps/backend` unit specs. Runner: **Jest + ts-jest** (`apps/backend/jest.config.js`).

## Ground rules

- **How to build the SUT:**
  - **Services & controllers → NestJS testing module.** `Test.createTestingModule({...}).compile()` then `moduleRef.get(SutClass)` (`beforeEach` is `async`). Controllers under `controllers: [...]`, the SUT and injected deps under `providers: [...]`.
  - **Use cases → plain function calls.** Call the pure function with fake ports (`jest.fn()`); no testing module.
  - **Infra clients (`docker.client`, `redis.client`) → plain instantiation.** Not Nest providers, so `new Client(config)` and `jest.mock` the transport module (`dockerode`, `ioredis`).
  - **Guards & Passport strategies → plain instantiation.** `new Guard(reflectorMock)` / `new Strategy(...mockedPorts)` with a fake `ExecutionContext`. For a guard extending Passport's `AuthGuard`, stub the base `canActivate` (spy on the prototype's prototype) so no real strategy runs; drive the `@Public()` branch via the mocked `Reflector`.
- **Mock ports/collaborators as value providers:** `{ provide: <class>, useValue: <mock> }`, structurally mocked with `jest.fn()`. Type via `jest.Mocked<Pick<T, 'usedMethod'>>` (only what the SUT calls), `jest.Mocked<T>`, or `{} as jest.Mocked<T>`.
- **Path aliases work in specs:** `@core/*` / `@features/*` resolve via `moduleNameMapper` in `jest.config.js`. Import cross-feature collaborators by alias.
- `jest.clearAllMocks()` in `beforeEach`.
- Behavior-focused `it` names reading as a contract: `delegates…`, `returns…`, `propagates…`, `throws…`.

## File placement

Specs in a `__tests__/` dir next to the SUT, `<name>.spec.ts`. Exception: root `app.controller.spec.ts` / `app.service.spec.ts` sit directly beside the code.

## The `@octokit/*` ESM gotcha

`@octokit/*` ships ESM and breaks the ts-jest CJS transform at transform time — so **any spec whose import graph transitively reaches `@features/providers/infrastructure/github/github-app.provider` must stub it**, even when building through the Nest testing module:

```ts
jest.mock('@features/providers/infrastructure/github/github-app.provider', () => ({
    GithubAppProvider: class GithubAppProvider {},
}));
```

Needed by most feature controller/service specs. Not needed by pure infra specs (docker/redis clients), `app.*` specs, or the real `github-app.provider.spec.ts` (which mocks `@octokit/rest` + `@octokit/auth-app` directly). If unsure, add it — it's harmless.

## What to cover per SUT

- Happy path per public method / handler (delegation + return value).
- Error branch: SUT **propagates** the collaborator's rejection (`rejects.toBe(error)`).
- Edge cases: empty lists, `null`/absent → `NotFoundException` (controllers), config fallbacks (clients).
- Controllers that wrap daemon errors: assert `ServiceUnavailableException`, and a pre-thrown one is rethrown unchanged. Their error-branch tests legitimately emit `logger.error` output — expected, not a failure.

## Skeletons

**UI service — testing module, value-provider deps, mocked use-case modules:**

```ts
import { Test } from '@nestjs/testing';
import { getDeploymentsByServiceUseCase } from '../../../application/get-deployments-by-service.use-case';
import { DeploymentsDatabaseRepository } from '../../../infrastructure/database/deployments-db.repository';
import { DeploymentsService } from '../deployments.service';

jest.mock('@features/providers/infrastructure/github/github-app.provider', () => ({
    GithubAppProvider: class GithubAppProvider {},
}));
jest.mock('../../../application/get-deployments-by-service.use-case');

const useCaseMock = getDeploymentsByServiceUseCase as jest.MockedFunction<typeof getDeploymentsByServiceUseCase>;

describe('DeploymentsService', () => {
    let repository: jest.Mocked<DeploymentsDatabaseRepository>;
    let sut: DeploymentsService;

    beforeEach(async () => {
        jest.clearAllMocks();
        repository = {} as jest.Mocked<DeploymentsDatabaseRepository>;
        const moduleRef = await Test.createTestingModule({
            providers: [DeploymentsService, { provide: DeploymentsDatabaseRepository, useValue: repository }],
        }).compile();
        sut = moduleRef.get(DeploymentsService);
    });

    it('delegates to the use case with the repository and service id', async () => {
        useCaseMock.mockResolvedValue([]);
        await sut.getAllByService('svc-id');
        expect(useCaseMock).toHaveBeenCalledWith(repository, 'svc-id');
    });
});
```

**UI controller — controller under `controllers`, service as value provider:**

```ts
describe('DeploymentsController', () => {
    let service: jest.Mocked<Pick<DeploymentsService, 'findById'>>;
    let sut: DeploymentsController;

    beforeEach(async () => {
        service = { findById: jest.fn() };
        const moduleRef = await Test.createTestingModule({
            controllers: [DeploymentsController],
            providers: [{ provide: DeploymentsService, useValue: service }],
        }).compile();
        sut = moduleRef.get(DeploymentsController);
    });

    it('throws NotFoundException when the deployment does not exist', async () => {
        service.findById.mockResolvedValue(null);
        await expect(sut.findById('id')).rejects.toBeInstanceOf(NotFoundException);
    });
});
```

**Infra client — plain instantiation, mock the transport constructor, drive config:**

```ts
jest.mock('ioredis', () => jest.fn().mockImplementation(() => ({ disconnect: jest.fn() })));
const RedisMock = Redis as unknown as jest.Mock;
// new RedisClient(configWith({ REDIS_HOST, REDIS_PORT })) → assert RedisMock called with that host/port
```

## Run

- Scoped: `pnpm --filter backend test -- <spec-name>`.
- Full suite: `pnpm --filter backend test`.
- Never run ESLint, install deps, or run Playwright/E2E.
