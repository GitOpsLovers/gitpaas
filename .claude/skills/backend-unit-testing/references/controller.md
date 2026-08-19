# Controller testing

A controller in `features/*/ui/controllers/` is a **thin HTTP boundary**. It sends the call to the adjacent service and changes the result into an HTTP result. The canonical reference is `features/services/ui/controllers/__tests__/services.controller.spec.ts`.

**Build the SUT.** Use a testing module with an `async beforeEach`. Put the controller in `controllers`, and each injected service as a value provider under its class. Make the mock of the service as a `jest.Mocked<Pick<Service, …>>` of real `jest.fn()`s, and make that mock again for each test:

```ts
mockServicesService = {
    getAllByProject: jest.fn(), findById: jest.fn(), create: jest.fn(), update: jest.fn(), delete: jest.fn(),
};

const moduleRef = await Test.createTestingModule({
    controllers: [ServicesController],
    providers: [{ provide: ServicesService, useValue: mockServicesService }],
}).compile();

sut = moduleRef.get(ServicesController);
```

Give the module the exact dependencies that the controller injects, and no other dependency.

**What to assert:**

- **Delegation**: the handler calls the method of the service one time, with the exact arguments that it received.
- **Shape of the return value**: `toBe(service)` for a value that passes through, and `toEqual([service])` or `toEqual([])` for a list.
- **The HTTP translation that the controller does**: an absent result gives `rejects.toBeInstanceOf(NotFoundException)`, with a separate test for the message (`rejects.toThrow(\`Service ${serviceId} not found\`)`); a handler with `@HttpCode(204)` gives `resolves.toBeUndefined()`; a failure of the daemon or of an adapter gives `ServiceUnavailableException` (see the controllers of the containers, of the networks and of the server).
- **Error propagation**: an error with no translation comes back with no change — `rejects.toBe(error)`.
- **Do not** run the real logic of the service or the mechanics of the framework (`ParseUUIDPipe`, the routes, `class-validator`). Give valid arguments directly to the handler.

**For a handler with `@Sse` that returns an `Observable`** (`LogsController.streamLogs`), stub the service with `mockReturnValue(of(...events))` or with `mockReturnValue(EMPTY)`, and never with `mockResolvedValue`. Assert the delegation **synchronously**, because the handler returns an `Observable`. Thus do not use `await` on the handler. Then collect the stream and assert the SSE mapping:

```ts
const received = await firstValueFrom(sut.streamLogs(deploymentId).pipe(toArray()));

expect(received).toEqual([{ data: JSON.stringify(events[0]) }, { data: JSON.stringify(events[1]) }]);
```

For an empty stream, use `EMPTY`, because the `of<T>()` overload with no argument is deprecated. Do not use the `done` callback of Jest.
