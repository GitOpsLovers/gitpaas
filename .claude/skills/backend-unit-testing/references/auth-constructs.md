# Passport strategies, guards, filters and decorators

These elements are thin primitives of the framework. Each spec makes the instance **directly**, with no testing module, and makes a fake context from `jest.fn()`s.

**Passport strategies** (`features/authentication/infrastructure/passport/`): make the instance with the mocked ports, and replace the called use case with `jest.mock`. Assert the delegation and the error translation of the strategy: each domain error becomes an `UnauthorizedException`, and the strategy throws an unexpected error again with no change (`rejects.toBe(boom)`).

**Guards** (`features/authentication/ui/guards/`): use `new JwtAuthGuard(mockReflector as unknown as Reflector)`. Stub the base class of Passport, so that no real strategy operates:

```ts
superCanActivate = jest
    .spyOn(Object.getPrototypeOf(JwtAuthGuard.prototype) as JwtAuthGuard, 'canActivate')
    .mockReturnValue(true);
```

Make the `ExecutionContext` with a `contextFor()` arrow. Its `getHandler` and `getClass` are `jest.fn()`s that return a stable handler and a class for the test only. Assert that the `@Public()` branch returns `true`, that it reads `IS_PUBLIC_KEY` with `[handler, class]`, and that it never calls the base class. Assert that the `false` branch and the `undefined` branch both send the call to the base class with the context. Always keep the returned value in a variable (`const result = sut.canActivate(context)`), and do not discard the call. The spec uses a spy, and thus it needs an `afterEach` with `restoreAllMocks()`.

A subclass of `AuthGuard` with no behavior (`LocalAuthGuard extends AuthGuard('local') {}`) gets a **minimum spec** only. That spec shows that the class makes an instance and that it gives the contract of Passport (`typeof sut.canActivate`, `handleRequest`, `logIn`). Do not assert the private names of the strategies, and do not invent a behavior.

**Exception filters** (`core/ui/filters/`): use `new AllExceptionsFilter(mockHttpAdapterHost)`, and call `sut.catch(exception, host)` directly. Make the `ArgumentsHost` with a `hostFor(request, response)` arrow whose `switchToHttp` returns `{ getRequest, getResponse }`. Assert the observable boundary only:

- the filter calls `reply` one time with `(response, envelope, statusCode)`: use `toBe` for the identity of the response, and `toEqual` with `timestamp: expect.any(String)` for the envelope;
- the filter keeps the status and the message of an `HttpException`;
- the filter keeps the message array of a `BadRequestException` as an array;
- the filter changes a simple `Error` into a generic 500 with no stack: assert that `JSON.stringify(envelope)` does not contain the stack;
- the filter writes one warning for a 4xx error, and one error for a 5xx error with the stack as the second argument.

The filter puts a spy on `Logger.prototype`. Thus restore the spy in `afterEach`.

**Decorators** (`features/authentication/ui/decorators/`):

- *Parameter decorators.* NestJS keeps the callback of `createParamDecorator` internal. Thus the code **extracts and exports** the factory, and gives `currentUserFactory` to `createParamDecorator` by reference. The spec calls `currentUserFactory(undefined, context)` directly, with a fake `ExecutionContext`. It asserts the exact value that the code attaches (`toBe` on a `User` fixture), that it calls both mocks of the context one time, and the case with no authentication (`toBeUndefined()`).
- *Metadata decorators.* Assert the literal value of the key (`expect(IS_PUBLIC_KEY).toBe('isPublic')`). Apply `Public()` to a class and to a method that you use for the test only, then read the metadata with a real `Reflector`. Test also the case with no decorator. To get a method, use its descriptor — `Object.getOwnPropertyDescriptor(Class.prototype, 'handler')?.value as () => void`. Do not use `Class.prototype.method`, because it causes the `@typescript-eslint/unbound-method` error.
