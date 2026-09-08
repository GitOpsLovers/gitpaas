# Avoid circular dependencies

Two modules that import each other, directly or through a chain, are a circular dependency.
Extract the shared logic into a third module when you can. When the cycle is the honest shape of
the domain — two features that each hold a real reference to the other — wrap the import of the
`imports` array with `forwardRef(() => OtherModule)` on both sides.

The backend already accepts four such pairs, and no agent must remove them:

- `features/networks/networks.module.ts` and `features/services/services.module.ts`
- `features/volumes/volumes.module.ts` and `features/services/services.module.ts`
- `features/services/services.module.ts` and `features/deployments/deployments.module.ts`
- `features/deployments/deployments.module.ts` imports `NetworksModule` and `VolumesModule` with
  the same `forwardRef`

```typescript
// features/deployments/deployments.module.ts
imports: [
    forwardRef(() => ServicesModule),
    forwardRef(() => NetworksModule),
    forwardRef(() => VolumesModule),
],
```

A new cycle outside this list is a design smell. Report it, and do not copy the pattern.
