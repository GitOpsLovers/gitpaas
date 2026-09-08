# Handle a floating promise

A promise that no `await` and no `return` consumes can reject with no handler, and crash the
process. ESLint bans the `void` operator, so `void somePromise()` is not the fix. End the
floating promise with `.catch(...)` instead.

```typescript
// features/deployments/application/run-deployment.use-case.ts
logStore.append(payload.deploymentId, maskSecretValuesUseCase(line, secrets)).catch(() => undefined);

buildVolumesUseCase(...)
    .catch(() => { emit('▹ The volumes of the Compose file could not be recorded.'); });
```

The `.catch` callback reports the failure with `AppLogger` or with a message on the stream, and it
never rethrows — a floating promise has no caller left to catch the exception.
