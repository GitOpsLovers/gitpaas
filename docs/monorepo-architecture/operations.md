# Operations

| Root script    | Command                 |
|----------------|-------------------------|
| `dev`          | `turbo run dev`         |
| `build`        | `turbo run build`       |
| `lint`         | `turbo run lint`        |
| `test`         | `turbo run test`        |
| `check-types`  | `turbo run check-types` |

Today, no application has an implementation of `check-types`.

| Workflow        | Trigger              | Does                                                                       |
|-----------------|----------------------|----------------------------------------------------------------------------|
| `pr-verify.yml` | PR to `main`         | `pnpm install --frozen-lockfile`, then `pnpm run lint` and `pnpm run test` |
| `release.yml`   | `workflow_dispatch`  | semantic-release, then multi-arch image publish (see infrastructure doc)   |
