# Operations

| Script  | Command                                        |
|---------|------------------------------------------------|
| `dev`   | `ng serve`                                     |
| `build` | `ng build`                                     |
| `watch` | `ng build --watch --configuration development` |
| `lint`  | `eslint .`                                     |
| `test`  | `ng test --watch=false`                        |

The API base URL comes **from the build** and is read from `src/environments/environment.ts`. For a development build, `angular.json` puts `environment.development.ts` in its place with `fileReplacements`. Thus each self-hosted deployment must set `apiBaseUrl` (with the `/api/v1` prefix) before the build.
