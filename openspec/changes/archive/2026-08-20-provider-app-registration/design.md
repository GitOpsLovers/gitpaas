## Context

See `proposal.md` — Why.

Four facts of the platform shape this design:

1. **The token travels in a header.** The frontend keeps the token of access in the storage of the browser, and an interceptor puts it into the header `Authorization`. A navigation of the top level carries no header. So an address that GitHub sends the browser to cannot be an endpoint of the API.
2. **The manifest flow of GitHub ends before the installation.** The conversion answers with the identifier of the application, its short name and its private key. It never answers with the identifier of an installation. That identifier arrives from a second, separate visit to GitHub.
3. **The provider record needs three credentials.** The adapter builds an Octokit client from `appId`, `privateKey` and `installationId`. A record without the third one serves nothing.
4. **`@nestjs/schedule` is a dependency, and the application registers no `ScheduleModule`.** The sweep of the abandoned registrations is the first scheduled job of the backend.

The flow therefore runs through five calls, and the platform holds a secret between two of them.

```
 /providers/add
    │ POST /providers/registrations          (admin, token)
    ▼
 pending row: awaiting_creation
    │ the browser submits a form to github.com
    ▼
 GitHub — the operator presses "Create GitHub App"
    │ redirect_url → a screen of the frontend, ?code=…&state=…
    ▼
 the screen calls POST /providers/registrations/:state/conversion
    │
    ▼
 pending row: awaiting_installation   ◀── the row holds the PEM here
    │ the browser goes to github.com/apps/{slug}/installations/new
    ▼
 GitHub — the operator picks the repositories
    │ setup_url → a screen of the frontend, ?installation_id=…&state=…
    ▼
 the screen calls POST /providers/registrations/:state/completion
    │
    ▼
 the provider exists, and the pending row is gone
```

## Goals / Non-Goals

**Goals:**

- Keep every endpoint of the platform behind the guard of the roles. This change opens no public endpoint.
- Keep the manual path whole. An operator who owns a GitHub App registers it as before.
- Let the platform, not the operator, decide the permissions of an App that the platform creates.
- Report a missing permission before a deployment discovers it.

**Non-Goals:**

- The design does not remove a GitHub App from the account of the operator, at any moment.
- The design does not reconcile the name of the provider with the name of the App.
- The design declares no webhook in the manifest. The change `deploy-developer-experience` owns the webhooks.
- The design does not verify that the operator administers an organization.

## Decisions

### The addresses of the return point at the frontend, not at the backend

GitHub sends the browser to `redirect_url` and to `setup_url` with a navigation of the top level. That navigation carries no header, so it carries no token. Two answers exist:

| Option                              | How it behaves |
|-------------------------------------|---|
| **The return reaches the backend**  | The endpoint must accept a caller with no token. The state becomes the only credential of a public endpoint. The endpoint then answers with a redirection to the frontend. |
| **The return reaches the frontend** | A screen of the SPA reads the query, and it calls the API with the token that it already holds. Every endpoint stays behind the guard of the roles. |

**The choice: the return reaches the frontend.** The platform has no public endpoint today, and the proposal of `deploy-developer-experience` treats its own first public endpoint as a thing that needs special care. This change should not spend that care on a problem that the SPA solves for free.

One consequence: a user whose session ended during the visit to GitHub lands on a screen that cannot call the API. The screen sends the user to the sign-in, and it keeps the address of the return, so the flow resumes after the sign-in.

### The pending registration lives in PostgreSQL, in its own table

The row must survive a restart of the backend, and it must hold an encrypted key. It also has a life of twelve hours, which is long for a value of a cache.

The alternative was a nullable `installationId` on the table `providers`. It was refused: every read of a provider would then have to skip the incomplete rows, the unique name would be held by a provider that does not work yet, and the service that picks a provider could pick one that reaches no repository. A separate table keeps the table `providers` meaning exactly what it means today — a provider that operates.

```
  provider_registrations
  ┌──────────────────────┬────────────────────────────────────────┐
  │ id                   │ uuid, generated                        │
  │ state                │ text, unique, 32 random bytes, hex     │
  │ name                 │ text                                   │
  │ ownerType            │ text: 'personal' | 'organization'      │
  │ ownerLogin           │ text, null for a personal account      │
  │ step                 │ text: 'awaiting_creation'              │
  │                      │     | 'awaiting_installation'          │
  │ appId                │ text, null until the conversion        │
  │ appSlug              │ text, null until the conversion        │
  │ encryptedPrivateKey  │ text, null until the conversion        │
  │ createdAt            │ timestamptz                            │
  │ expiresAt            │ timestamptz, createdAt + 12 hours      │
  └──────────────────────┴────────────────────────────────────────┘
```

The column `state` carries a unique index, because every call after the first one finds the row by it.

### The life of a row is twelve hours, and the job runs every hour

GitHub kills the temporary code after one hour. A row at the step `awaiting_creation` is therefore dead by the rule of GitHub long before its own date. The twelve hours matter for the second step only: an operator who leaves after the creation of the App, and who returns the same day, finds the registration alive.

The cost is stated plainly: **a private key of a real GitHub App sits in the database for up to twelve hours, with no provider that points at it.** The key is encrypted with the same cipher as the key of a provider, so it carries the same risk that the platform already accepts. The operator chose this window knowingly.

A period of one hour for the job is enough for a life of twelve hours. The rows are few, and the removal is one statement.

### The test of the connection answers with an outcome, not with a mark of success

The alternative was `{ success: boolean, missingPermissions: string[] }`. It was refused, because it lets `success: true` describe a provider that fails at the next deployment. Every reader would then have to remember to look at the second field.

The chosen shape names the state one time:

```
  { outcome: 'ok' | 'unauthorized' | 'incomplete', missingPermissions: string[] }
```

This changes the shape of the answer of `POST /api/v1/providers/:id/test`. The frontend of this repository is the one client, and this change carries both sides.

The port answers the raw facts, and the use case judges them. `verifyCredentials` answers whether GitHub accepts the credentials, together with the permissions that the application carries. The comparison against the needs of the platform lives in the application layer, where the list of the needed permissions lives. Thus a second kind of provider, one day, brings its own list without a change of the port.

### The needed permissions live in one constant

`contents: read` and `metadata: read` serve three places: the manifest, the check of the test and the statement on the form. One constant of the domain holds them, the backend reads it for the first two, and the frontend holds its own copy for the statement on the form.

The comparison reads "at least this level". GitHub orders the levels `read`, `write` and `admin`, and an App with a higher level satisfies a lower need.

### The end of a registration is one transaction

The write of the provider and the removal of the pending row must not separate. If the write succeeds and the removal fails, the job later removes a row whose key already lives in a provider — harmless. If the removal succeeds and the write fails, the operator loses the key of a real App, and the App becomes unreachable forever. So the two acts run in one transaction of the database.

### The name of the provider and the name of the App may differ

The operator types one name. The system sends it as the `name` of the manifest, and it writes it into the provider. If GitHub refuses the name, the operator corrects it on the screen of GitHub, and the two names then differ.

The system reads no name back from the conversion. The name of the provider is a label of GitPaaS, and the name of the App is a label of GitHub. The operator owns both, and the platform reconciles neither.

## Risks / Trade-offs

**The operator abandons the flow after the conversion.** → The App exists on GitHub, and no provider points at it. The job removes the row after twelve hours, and the App stays. The screen of the failure states that the App may exist and that GitPaaS cannot remove it. The operator removes it on GitHub.

**A private key sits in the database with no owner.** → It is encrypted with the cipher of the providers, and it lives at most twelve hours. The job removes it even when the operator never returns.

**The name that GitHub refuses.** → The platform cannot know before the redirect whether a name is free worldwide. GitHub shows its own form with the name filled in, and the operator corrects it there. No call is lost.

**The operator does not administer the named organization.** → GitHub refuses the registration on its own screen. The pending row stays until the job removes it. The platform runs no check of its own, because a check would need a token of the user for GitHub, which the platform does not hold.

**The shape of the answer of the test changes.** → It is a breaking change of the API. The frontend of this repository is the one client, and this change carries it. An operator who wrote a script against that endpoint must adapt it.

**The first scheduled job of the backend.** → `ScheduleModule.forRoot()` enters the module of the application. Two instances of the backend would then run the job two times. The removal is idempotent, so a double run removes the same rows and harms nothing.

## Migration Plan

1. The migration adds the table `provider_registrations`. It touches no existing table, so the deployment needs no window of maintenance.
2. The backend and the frontend deploy together, because the answer of the test changes shape.
3. The rollback drops the table. A registration that runs at that moment is lost, and its App stays on GitHub. No provider that operates is touched.
