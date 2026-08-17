# Operations

| Root script    | Command                 |
|----------------|-------------------------|
| `dev`          | `turbo run dev`         |
| `build`        | `turbo run build`       |
| `lint`         | `turbo run lint`        |
| `test`         | `turbo run test`        |
| `check-types`  | `turbo run check-types` |

Today, no application has an implementation of `check-types`.

## Continuous Integration

The repository has a series of configured CI/CD pipelines that perform various operations on it:

| Workflow         | Purpose                                 | Trigger               | 
-------------------|-----------------------------------------|-----------------------|
| `pr-verify.yml`  | Lint and test every pull request        | On open pull requests |
| `pr-labeler.yml` | Apply a `kind/` label to a pull request | On open pull requests |
| `release.yml`    | Publish a new release                   | Manual trigger        |