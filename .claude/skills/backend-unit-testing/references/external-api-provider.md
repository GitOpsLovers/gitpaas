# External-API provider testing

`features/providers/infrastructure/github/github-providers.adapter.ts` puts Octokit behind the port of the providers. It makes an authenticated client at the first call, keeps that client in memory, and maps the responses of the SDK into the domain models. The reference is `github-providers.adapter.spec.ts`.

**Build the SUT.** Make the instance directly: `new GithubProvidersAdapter(createConfig(), createDiagnostics())`. `createConfig(values)` and `createDiagnostics()` are `const` arrows that return the stubs of `ConfigService` and of `DiagnosticLoggerService`. The fake client is a small manual `FakeClient { paginate: jest.Mock; request: jest.Mock }`. The overloads of Octokit make `jest.Mocked<Pick<Octokit, …>>` too difficult, and a comment in the spec gives that cause.

**Split the spec into two layers:**

- **Layer A — the mapping, with Octokit in isolation.** Put a spy on the private getter of the client, and make it return the fake client:

  ```ts
  jest.spyOn(sut as unknown as { getClient: () => unknown }, 'getClient').mockReturnValue(mockClient);
  ```

  Then assert the exact endpoints and parameters (`paginate('GET /installation/repositories')`, `request('GET /repositories/{id}', { id: 42 })`), the order of the steps with `toHaveBeenNthCalledWith`, the result in the domain model, the decode steps (the content of a file in base64, the `Buffer` of an archive), and the error translation (`NotFoundException` for content that is not a file). The spec uses a spy. Thus it adds `jest.restoreAllMocks()` in `afterEach`, with `clearAllMocks()`.
- **Layer B — the creation of the client and the authentication, against the stub of the `Octokit` constructor.** Make a real call to the domain and assert: an absent configuration gives a `ServiceUnavailableException`, and the spec never calls the constructor; the exact arguments of the constructor (the strategy of the authentication, the decoded private key, and the numeric id of the installation); and the client in memory, which the adapter makes one time for several calls.
