# The known deviations of the backend

The pages of `docs/architecture/backend/` give the canonical pattern. These are the known places where the code still deviates from it. Do not copy a deviation into new code; fix the pattern it applies to when you touch that file.

## The not-found pattern

The canonical not-found pattern is a domain error thrown inside the use case: the use case reads a `null` repository result, throws the feature's `<Entity>NotFoundError`, and the controller's `catch` block turns it into a `404` with `throw translateError(error)` (for example `projects/application/find-project-by-id.use-case.ts`). Two feature controllers still deviate from this pattern:

- `namespaces` builds the domain error in the controller and passes it to `translateError`, instead of throwing it from the use case.
- `services` raises a raw `NotFoundException` in the controller, with no domain error at all.

The domain never throws an HTTP exception; only the canonical pattern keeps that rule.

## The Passport strategies

The Passport strategies (`features/authentication/infrastructure/passport/jwt.strategy.ts` and `local.strategy.ts`) throw `UnauthorizedException` and do not use `translateError`. The guard operates before each controller method, so no controller can do the translation there.
