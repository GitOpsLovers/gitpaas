# Environment configuration

`apps/frontend` configures itself at the build, with the two files of
`apps/frontend/src/environments/`:

- `environment.ts` gives the production value: `apiBaseUrl: '/api/v1'`.
- `environment.development.ts` gives the local value:
  `apiBaseUrl: 'http://localhost:3000/api/v1'`.

Import the environment where a feature needs it:

```ts
import { environment } from '@environments/environment';

const apiUrl = environment.apiBaseUrl;
```

`apps/frontend/angular.json` swaps the file with `fileReplacements` of the `development`
configuration:

```json
"fileReplacements": [
  { "replace": "src/environments/environment.ts", "with": "src/environments/environment.development.ts" }
]
```

> **Security note:** an environment file is bundled into the client-side application, and anyone
> who loads the page can read it. Never store an API key, a secret, or a credential in one.
