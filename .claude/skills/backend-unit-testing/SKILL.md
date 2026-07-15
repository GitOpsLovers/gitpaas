---
name: backend-unit-testing
description: Enable this skill when the user requests to work with the testing layer of the backend application.
---

# Backend unit testing skill

Practical conventions for `apps/backend` unit specs, drawn from the existing suite. Runner is **Jest + ts-jest** (`apps/backend/jest.config.js`).

## Ground rules

- **The SUT-building boundary:**
  - **Services & controllers → NestJS testing module.** Build the SUT with `Test.createTestingModule({ … }).compile()` and acquire it via `moduleRef.get(SutClass)`. Controllers go under `controllers: [...]`; the SUT service and all injected deps go under `providers: [...]`. Because compilation is async, `beforeEach` is `async`.
  - **Infra clients (`docker.client`, `redis.client`) → plain instantiation.** These are not Nest providers, so keep `new Client(config)` and `jest.mock` the external transport module (`dockerode`, `ioredis`). No testing module.
- **Register injected deps as value providers.** Each collaborator is `{ provide: <class/token>, useValue: <mock> }`, mocked structurally with `jest.fn()`. Type the mock via `jest.Mocked<Pick<T, 'usedMethod'>>` (only the methods the SUT calls), `jest.Mocked<T>`, or `{} as jest.Mocked<T>` when a use-case module is what's really mocked.
- **Path aliases work in specs.** `@core/*` and `@features/*` resolve via `moduleNameMapper` in `jest.config.js`. Import cross-feature collaborators by alias.
- `jest.clearAllMocks()` in `beforeEach`.
- Behavior-focused `it` descriptions reading as a contract: `delegates…`, `returns…`, `propagates…`, `throws…`.

## File placement

- Specs live in a `__tests__/` dir next to the SUT, named `<name>.spec.ts`.
- **Exception:** root-level `app.controller.spec.ts` / `app.service.spec.ts` sit as direct siblings of the code (no `__tests__/`).

## The `@octokit/*` ESM gotcha (important)

`@octokit/*` ships ESM and breaks the ts-jest CJS transform. This is a transform-time problem, so it persists even when you build the SUT through the Nest testing module — **any spec whose import graph transitively reaches `@features/providers/infrastructure/github/github-app.provider` must still stub it:**

```ts
jest.mock('@features/providers/infrastructure/github/github-app.provider', () => ({
    GithubAppProvider: class GithubAppProvider {},
}));
```

- **Needed by** most feature specs (controllers/services that import a chain touching `GithubAppProvider`).
- **Not needed by** pure infra specs (docker/redis clients, `DockerService`), `app.*` specs, or the real `github-app.provider.spec.ts` (which instead mocks `@octokit/rest` + `@octokit/auth-app` directly to test the provider itself).
- If unsure, add it — it's harmless. Cleaner long-term fix (not yet adopted): configure `transformIgnorePatterns` to transpile `@octokit/*`; the stub is the current convention.

## What to cover per SUT

- Happy path per public method / handler (delegation + return value/reference).
- Error/failure branch: assert the SUT **propagates** the collaborator's rejection (`rejects.toBe(error)`).
- Edge cases: empty lists, `null`/absent entity → `NotFoundException` (controllers), config fallbacks/coercion (clients).
- **Controllers:** where present, daemon/unexpected errors wrapped into `ServiceUnavailableException` (and a pre-thrown `ServiceUnavailableException` rethrown unchanged).
- Controller error-branch tests legitimately emit `logger.error` output — that is expected, not a failure.

## Skeletons

### Infra client spec — plain instantiation, mock the transport constructor, drive config

```ts
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { RedisClient } from '../redis.client';

jest.mock('ioredis', () => jest.fn().mockImplementation(() => ({ disconnect: jest.fn() })));
const RedisMock = Redis as unknown as jest.Mock;

const createConfig = (values: Record<string, unknown> = {}): ConfigService =>
    ({ get: jest.fn((k: string, d?: unknown) => (k in values ? values[k] : d)) }) as unknown as ConfigService;

describe('RedisClient', () => {
    beforeEach(() => jest.clearAllMocks());

    it('builds a connection from the configured host and port', () => {
        const client = new RedisClient(createConfig({ REDIS_HOST: '10.0.0.7', REDIS_PORT: 6380 }));
        client.getClient();
        expect(RedisMock).toHaveBeenCalledWith(expect.objectContaining({ host: '10.0.0.7', port: 6380 }));
    });
});
```

### UI service spec — testing module, value-provider deps + mocked use-case modules

Register the SUT plus one `{ provide, useValue }` entry per injected collaborator, then `moduleRef.get` the SUT. `beforeEach` is `async`.

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
            providers: [
                DeploymentsService,
                { provide: DeploymentsDatabaseRepository, useValue: repository },
                // { provide: OtherCollaborator, useValue: … } — one entry per injected dep
            ],
        }).compile();

        sut = moduleRef.get(DeploymentsService);
    });

    it('delegates to the use case with the repository and service id', async () => {
        useCaseMock.mockResolvedValue([]);
        await sut.getAllByService('svc-id');
        expect(useCaseMock).toHaveBeenCalledWith(repository, 'svc-id');
    });

    it('propagates errors thrown by the use case', async () => {
        const error = new Error('db unreachable');
        useCaseMock.mockRejectedValue(error);
        await expect(sut.getAllByService('svc-id')).rejects.toThrow(error);
    });
});
```

### UI controller spec — testing module, controller + value-provider service

The controller goes under `controllers: [...]`; each dependency is a value provider under `providers: [...]`.

```ts
import { NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';

import { DeploymentsService } from '../../services/deployments.service';
import { DeploymentsController } from '../deployments.controller';

jest.mock('@features/providers/infrastructure/github/github-app.provider', () => ({
    GithubAppProvider: class GithubAppProvider {},
}));

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

    it('throws a NotFoundException when the deployment does not exist', async () => {
        service.findById.mockResolvedValue(null);
        await expect(sut.findById('id')).rejects.toBeInstanceOf(NotFoundException);
    });

    it('propagates errors raised by the service', async () => {
        const error = new Error('db unreachable');
        service.findById.mockRejectedValue(error);
        await expect(sut.findById('id')).rejects.toBe(error);
    });
});
```

## Run

- Scoped: `pnpm --filter backend test -- <spec-name>` (jest resolves the `@core`/`@features` mappers automatically).
- Full suite: `pnpm --filter backend test`.
- Never run ESLint, never install deps, never run Playwright/E2E (project rules).
