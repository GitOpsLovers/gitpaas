# Transformer testing

Each `*.transformer.ts` file has its own spec (`db-projects.transformer.spec.ts`, `docker-container-runtime.transformer.spec.ts`, …). A transformer is a pure function. Thus its spec has no mocks, no `beforeEach` and no alias for the SUT. Use `describe('<functionName>')`, make an input literal with a full type, and assert `toEqual` on the mapped output.

```ts
describe('toService', () => {
    it('maps every service entity field into the domain model', () => {
        const entity: DbServiceEntity = { /* … */ };

        expect(toService(entity)).toEqual({ /* … */ });
    });
});
```

Test each default value and each alternative value that the transformer holds: an empty string in a column, a `null` value, a conversion between an epoch and a date, and an absent optional field. Write one `it` for each behavior.
