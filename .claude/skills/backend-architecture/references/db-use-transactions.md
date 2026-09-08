# Use a transaction for a multi-step write

When two or more writes must succeed together, or fail together, wrap them in
`repository.manager.transaction(async (manager) => { ... })`. Get every repository of the
transaction from `manager.getRepository(...)`, and never from the field injected in the
constructor — that one runs outside the transaction.

```typescript
// features/providers/infrastructure/database/db-provider-registrations.repository.ts
public async complete(state: string, completion: ProviderRegistrationCompletion): Promise<Provider> {
    const saved = await this.repository.manager.transaction(async (manager) => {
        const providers = manager.getRepository(DbProviderEntity);

        const provider = await providers.save(providers.create({ ... }));
        await manager.getRepository(DbProviderRegistrationEntity).delete({ state });

        return provider;
    });

    return toProvider(this.cipher, saved);
}
```

If any statement inside the callback throws, TypeORM rolls back every statement of the
transaction. A single `save` or `update` needs no transaction.
