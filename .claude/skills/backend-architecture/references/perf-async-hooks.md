# Return the promise of a lifecycle hook

`onModuleInit` and `onModuleDestroy` may return a `Promise`. Nest awaits it before it moves to the
next module, so an `await` inside the hook blocks the startup or the shutdown for as long as it
runs. Keep the hook to what genuinely needs that ordering — a subscription, a queue to drain, a
connection to close — and never a heavy computation that no other module waits on.

```typescript
// features/deployments/ui/services/deployment-runner.service.ts
public async onModuleInit(): Promise<void> {
    this.subscription = this.deploymentQueue.dequeued$.pipe(...).subscribe();

    await this.deploymentQueue.recoverPending();
}

public onModuleDestroy(): void {
    this.subscription?.unsubscribe();
}
```

`onModuleDestroy` here returns nothing, because `unsubscribe` is synchronous; a hook that closes a
socket or a pool returns its `Promise` instead, so Nest waits for the close before it exits.
