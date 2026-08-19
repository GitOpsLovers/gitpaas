# Database repository testing

A repository in `features/*/infrastructure/database/db-<name>.repository.ts` is a TypeORM adapter over one injected `Repository<Db…Entity>`. It maps the rows of the database into the domain models with a `to<Name>` transformer. The canonical reference is `features/projects/infrastructure/database/__tests__/db-projects.repository.spec.ts`.

**Build the SUT.** Make the instance directly in `beforeEach`, with no testing module. Each database repository injects one `Repository` only. Thus no spec in the suite uses `getRepositoryToken` today:

```ts
let mockRepository: jest.Mocked<
    Pick<Repository<DbProjectEntity>, 'find' | 'findOne' | 'findOneBy' | 'create' | 'merge' | 'save' | 'delete'>
>;
let sut: DatabaseProjectsRepository;

beforeEach(() => {
    jest.clearAllMocks();

    mockRepository = {
        find: jest.fn(), findOne: jest.fn(), findOneBy: jest.fn(),
        create: jest.fn(), merge: jest.fn(), save: jest.fn(), delete: jest.fn(),
    };
    sut = new DatabaseProjectsRepository(mockRepository as unknown as Repository<DbProjectEntity>);
});
```

**For each method, assert these items:**

- **Reads** (`find` / `findOne` / `findOneBy`): the SUT calls the TypeORM method one time with the **exact** object of options (`{ id }`, `{ where: { projectId }, order: { id: 'DESC' } }`, or a `find()` with no argument, asserted as `toHaveBeenCalledWith()`). Assert also the mapped domain result, an absent row → `toBeNull()`, and an empty list → `toEqual([])`.
- **Create**: the SUT calls `create` with the DTO (and with each change that the SUT applies), calls `save` with the made entity, and gives the mapped result.
- **Update** (find → `merge` → `save`, or find → change of a field → `save`): assert the merge or the change and the argument of `save`. Assert also the branch that finds nothing, which returns `null` and calls neither `merge` nor `save`.
- **`delete` or `update` that returns `{ affected }`**: test the three cases — `affected: 1` → `true`, `0` → `false`, and `undefined` → `false`. Stub the full shape of the result that the type demands (`{ affected: 1, raw: [] }`).
- **Bulk writes**: under `jest.Mocked<Pick<…>>`, the `create` and `save` overloads of TypeORM become the signature for one entity. Thus a stub with an array needs a local cast, and only there:

  ```ts
  (mockRepository.create as jest.Mock).mockReturnValue(entities);
  (mockRepository.save as jest.Mock).mockResolvedValue(entities);
  ```

  See `features/logs/infrastructure/database/__tests__/db-logs.repository.spec.ts`.

**These elements are not present today:** no database repository uses a QueryBuilder chain, `manager.transaction` or `upsert`. Do not invent a convention for them. If a repository starts to use one of them, add the convention here.
