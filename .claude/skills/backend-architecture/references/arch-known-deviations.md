# The known deviations of the backend

The pages of `docs/architecture/backend/` give the canonical pattern. These are the known places where the code still deviates from it. Do not copy a deviation into new code; fix the pattern it applies to when you touch that file.

Every feature controller now follows the canonical not-found pattern: the use case reads a `null`
repository result, throws the feature's `<Entity>NotFoundError`, and the controller's `catch`
block turns it into a `404` with `throw translateError(error)` (for example
`projects/application/find-project-by-id.use-case.ts`).

## The Passport strategies

The Passport strategies (`features/authentication/infrastructure/passport/jwt.strategy.ts` and `local.strategy.ts`) throw `UnauthorizedException` and do not use `translateError`. The guard operates before each controller method, so no controller can do the translation there.
