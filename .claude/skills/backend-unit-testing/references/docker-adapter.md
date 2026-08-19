# Container runtime & Docker adapter testing

There is **no `DockerClient` class**. The boundary of Docker is one port in Core: `ContainerRuntime` (`@core/domain/ports/container-runtime.port`). `DockerContainerRuntimeAdapter` (`@core/infrastructure/docker/docker-container-runtime.adapter`) is its only implementation. That adapter owns `dockerode`. It keeps a `Docker` handle from `getClient()` in memory, changes a `RuntimeSelector` into the `filters` of the daemon with `toLabelFilter`, and maps the data of the daemon into the runtime models (`RuntimeContainerSummary`, `RuntimeNetworkSummary`, `RuntimeImageSummary`, `RuntimePruneReport`, `ContainerRuntimeInfo`). In the features, each element that uses Docker calls that port, and never `dockerode`.

## Feature adapters over the runtime port

A Docker adapter or repository of a feature (`features/*/infrastructure/docker/docker-*.adapter.ts` or `docker-*.repository.ts`) injects `DockerContainerRuntimeAdapter` and uses it as a `ContainerRuntime`. Their specs never use `dockerode`. The references are `features/server/infrastructure/docker/__tests__/docker-server-pruner.adapter.spec.ts` (prune → `PruneResult`), `features/containers/infrastructure/docker/__tests__/docker-containers.repository.spec.ts` (list and map), `features/server/infrastructure/docker/__tests__/docker-orphan-containers.adapter.spec.ts` and `features/services/infrastructure/docker/__tests__/docker-service-runtime-resources.adapter.spec.ts` (teardown).

**Build the SUT.** Keep each method of the runtime in its own `jest.Mock`. Put the methods together in a `jest.Mocked<Pick<DockerContainerRuntimeAdapter, …>>`. Then add one cast at the constructor:

```ts
let mockListContainers: jest.Mock;
let mockRemoveContainer: jest.Mock;
let mockContainerRuntime: jest.Mocked<Pick<DockerContainerRuntimeAdapter, 'listContainers' | 'removeContainer'>>;
let mockDiagnostics: jest.Mocked<Pick<DiagnosticLoggerService, 'log' | 'warn'>>;
let sut: DockerOrphanContainersAdapter;

beforeEach(() => {
    jest.clearAllMocks();

    mockListContainers = jest.fn().mockResolvedValue([]);
    mockRemoveContainer = jest.fn().mockResolvedValue(undefined);
    mockContainerRuntime = { listContainers: mockListContainers, removeContainer: mockRemoveContainer };
    mockDiagnostics = { log: jest.fn(), warn: jest.fn() };
    sut = new DockerOrphanContainersAdapter(
        mockContainerRuntime as unknown as DockerContainerRuntimeAdapter,
        mockDiagnostics as unknown as DiagnosticLoggerService,
    );
});
```

Write the fixtures as `const` arrows that return the **runtime** models (`RuntimeContainerSummary`, `RuntimePruneReport`, …). Import those models with `import type` from `@core/domain/models/container-runtime.models`.

**Warning: a selector with no marker of ownership permits a query that reaches the control plane and the unrelated stacks of other suppliers on the host.**

**Always assert the marker of ownership in the selector.** Each list, prune and teardown must use the limit `io.gitpaas.managed=true`. `getGitpaasLabels()` in `@shared/application/get-gitpaas-labels.use-case` makes that marker. A selector for one stack adds `project` **in addition to** the marker, and never in place of it. Import the real constants from `@core/domain/constants/gitpaas-labels.constants` (`GITPAAS_MANAGED_LABEL`, `GITPAAS_MANAGED_VALUE`, `GITPAAS_PROJECT_LABEL`, `GITPAAS_CONTROL_PLANE_PROJECTS`), and do not declare them again. Thus a new name for a key makes the spec fail:

```ts
expect(mockListContainers).toHaveBeenCalledWith(
    { labels: { [GITPAAS_MANAGED_LABEL]: GITPAAS_MANAGED_VALUE }, project: null },
    true,
);
```

**What to assert:**

- **List and map**: the SUT calls the method of the runtime one time with the exact selector, and with `all: true` if the SUT asks for the stopped resources. Assert the mapped domain result, an empty list → `toEqual([])`, the alternative values for the name, the port and the short id, and the `service-<id>` alternative for the project when the name of the service gives an empty slug.
- **Prune**: the SUT calls each prune one time with the managed selector, and maps the `RuntimePruneReport` into a `PruneResult`. Test also the case with the counters at zero.
- **Teardown**: assert the selector for each list operation. Assert that the SUT calls `removeContainer`, `removeNetwork` or `removeImage` with the correct id and options (`{ force: true, removeVolumes: true }`). Assert the branches that protect or that skip a resource with `not.toHaveBeenCalled()`, the counts and names that the SUT returns, and the summary line `mockDiagnostics.log(...)`.
- **Resilience to an error**: the SUT catches one failure of a removal, calls `mockDiagnostics.warn`, and continues the loop — assert the resource that stays.
- **Obedience to the selector, for each operation with a risk of data loss.** The best teardown specs do not give a list with a filter to the SUT. They describe a real host with no filter: the compose stacks of other suppliers, the containers from `docker run` with no label, the control plane, and the containers that GitPaaS manages. `mockListContainers` applies the requested `RuntimeSelector` itself with a spec-local `matchesSelector` helper. Thus a selector that is too wide shows the protected containers and makes the test fail. Copy this shape each time that the SUT removes a resource.

## The runtime adapter itself

`core/infrastructure/docker/__tests__/docker-container-runtime.adapter.spec.ts` is the only spec that knows that `dockerode` exists. It replaces the constructor with a mock of the module. Then it drives the daemon as the production code does, through the `getClient()` method of the adapter, which keeps the client in memory:

```ts
jest.mock('dockerode', () => jest.fn());

const DockerMock = Docker as unknown as jest.Mock;

const buildSut = (): { sut: DockerContainerRuntimeAdapter; daemon: FakeDaemon } => {
    const sut = new DockerContainerRuntimeAdapter();
    const daemon = sut.getClient() as unknown as FakeDaemon;

    daemon.listContainers = jest.fn().mockResolvedValue([]);
    // …one jest.fn() per daemon method the adapter calls

    return { sut, daemon };
};
```

`FakeDaemon` is a manual interface of `jest.Mock`s, because the types of `dockerode` have too many overloads for a `Pick` of use. Test these items:

- the options of the client (`{ socketPath: '/var/run/docker.sock' }`), and that the adapter gives no other option;
- the client in memory: the adapter makes one client for each of its instances;
- the label filters for each shape of the selector;
- the mapping into the runtime models, for each method;
- the removals, which the adapter sends through `getContainer(id).remove(...)`;
- the prune operations, which give counters at zero as the alternative result.

## The Compose executor

`features/deployments/infrastructure/docker/__tests__/dockerode-docker-executor.adapter.spec.ts` covers `DockerodeDockerExecutorAdapter`. That adapter injects `DockerContainerRuntimeAdapter` and `DiagnosticLoggerService`, and it drives `dockerode-compose`, `tar` and `node:fs/promises`. The spec replaces those three libraries with its own `jest.mock(...)` calls, because they are not the Octokit packages with the central stubs. Build the SUT with an `executorWithDaemon(fakeDaemon)` arrow, which returns a fake daemon from `getClient()`.

The class keeps its logic in private helpers behind one public `up()` method. Thus the spec uses an **intended and documented exception** to the test of the public boundary only: an `ExecutorInternals` interface with types, and `const internals = (sut) => sut as unknown as ExecutorInternals`. A comment at the cast gives the cause.

The first level tests the helpers that give a fixed result:

- the helper that reads a duration;
- the helper that normalizes a build argument;
- the helper that resolves a path;
- the helper that follows a stream of progress.

The second level calls `up()` and asserts:

- the order of the emitted lifecycle lines;
- the order of `down` before `up`, with `mock.invocationCallOrder`;
- the cleanup of the temporary directory in the `finally` block, also when an early step throws an error.
