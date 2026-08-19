# DTO testing

The DTOs in `features/*/domain/dtos/` are the **authoritative contract of the input**. Each DTO is a class of `class-validator` decorators that the global `ValidationPipe` applies to each body of a request. The spec stays in a `__tests__/` folder adjacent to the DTO, with the name `<dto-name>.dto.spec.ts`. Thus `__tests__/create-deployment.dto.spec.ts` covers `create-deployment.dto.ts`. The canonical references are `features/deployments/domain/dtos/__tests__/create-deployment.dto.spec.ts`, `features/authentication/domain/dtos/__tests__/login.dto.spec.ts` and `features/projects/domain/dtos/__tests__/update-project.dto.spec.ts`.

**Validate through the same path as the production code.** Do not make the instance with `new`, and do not call a controller. Make the instance with `plainToInstance` from `class-transformer`. Then validate the instance with `validateSync` from `class-validator`, **with the same options as the global pipe in `src/bootstrap.ts`** (`whitelist: true`, `forbidNonWhitelisted: true`).

The spec must show the real contract of the runtime, because a different set of options tests a validator that the application does not run. For example, the pipe refuses an unknown property only because `forbidNonWhitelisted` is on. It refuses a number in a string only because the implicit conversion is off. Import `'reflect-metadata'` first, or the metadata of the decorators is not available.

**Each DTO spec has the same three spec-local helpers.** Copy the three helpers into each DTO spec with no change:

```ts
// eslint-disable-next-line import/no-unassigned-import
import 'reflect-metadata';

import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import type { ValidationError } from 'class-validator';

import { LoginDto } from '../login.dto';

/** Validates a raw payload exactly as the global ValidationPipe does. */
const validatePayload = (payload: Record<string, unknown>): ValidationError[] =>
    validateSync(plainToInstance(LoginDto, payload), {
        whitelist: true,
        forbidNonWhitelisted: true,
    });

/** Collects the constraint keys reported for a single property. */
const constraintsFor = (errors: ValidationError[], property: string): string[] =>
    Object.keys(errors.find((error) => error.property === property)?.constraints ?? {});

/** A payload satisfying every rule of the DTO. */
const validPayload = (overrides: Record<string, unknown> = {}): Record<string, unknown> => ({
    email: 'admin@gitpaas.dev',
    password: 'sup3r-s3cret',
    ...overrides,
});
```

The type of the payload is `Record<string, unknown>`, and not the type of the DTO. A spec must be able to send an incorrect type, an additional key or an absent key. An HTTP client can send the same data. To remove a property, call `delete payload.<name>` on a new `validPayload()`. To add an incorrect property, use the overrides argument. A DTO spec has no mocks and no `beforeEach`.

**Checklist — every DTO spec covers all of these:**

1. **A valid payload gives zero errors**: `expect(validatePayload(validPayload())).toEqual([])`.
2. **If a required field is absent, the DTO gives the expected constraint keys.** Assert the keys, and not the messages: `isString`, `isNotEmpty`, `isUuid`, `isEmail`, `isInt`, `min`, `isIn`, `isEnum`, `isDate`, `isJwt`. If a field declares more than one rule, use `expect.arrayContaining([...])`. For one key, use `toContain`.
3. **Each rule of format fails with a realistic incorrect value**: an id that is not a UUID (`'service-1'`), an incorrect email (`'admin@'`), a number that is not an integer or that is below the minimum, a value outside an `@IsIn` set, or an incorrect primitive type.
4. **If an optional field is absent, the payload stays valid**: remove the field from a valid payload and expect `[]`.
5. **An unknown property fails with `whitelistValidation`**: `expect(constraintsFor(errors, 'status')).toContain('whitelistValidation')`.
6. **If the DTO declares more than one rule, write one payload that gives several errors together.** Use an empty payload and assert the names of the reported properties. This test shows that the pipe reports the full contract in one response, and not the first failure only:

   ```ts
   it('reports every invalid property at once', () => {
       const errors = validatePayload({});

       expect(errors.map((error) => error.property).sort()).toEqual(
           ['branch', 'commit', 'commitMessage', 'composerPath', 'serviceId', 'triggeredBy'].sort(),
       );
   });
   ```

If a group of fields share the same rules, use `it.each` (`it.each(STRING_PROPERTIES)('requires %s', …)`), and do not repeat one `it` for each field.

**Record these two known behaviours in a test:**

- **`@IsOptional()` does not refuse `null`.** It stops each validator on the property for `undefined` **and** for `null`. Thus a `null` value passes even against `@IsString()` or `@IsIn(...)`. Record that behaviour with a test that has a name — `it('accepts a null error, since IsOptional skips null values', …)` — so that the spec gives the real contract, and not the intended contract.
- **`@IsDate()` without `@Type(() => Date)` refuses an ISO string.** The pipe operates with `transform: true`, but **not** with `enableImplicitConversion`. Thus `plainToInstance` keeps the string as a string, and `isDate` fails. The same applies to a number in a string against `@IsInt()`. Test the refused string and also the accepted `Date` or `number`:

  ```ts
  it('rejects an ISO string expiresAt, since no @Type(() => Date) conversion is declared', () => {
      const errors = validatePayload(validPayload({ expiresAt: '2026-01-01T00:00:00.000Z' }));

      expect(constraintsFor(errors, 'expiresAt')).toContain('isDate');
  });
  ```

**If a DTO has a defect, record the defect and do not correct it.** A DTO can accept data that it must refuse: a name of spaces only with no rule that trims it, a `null` value where the domain needs a value, or an absent `@Type()` that makes an ISO date unusable. Write the test that records the **current** behaviour. Give the `it` a name that gives the cause (`'accepts a whitespace-only name, as no trimming rule is declared'`). Report the defect to the caller. Do not change the DTO in a test task, because the DTO is product code, and a silent change of the rules breaks each client that sends the old shape.
