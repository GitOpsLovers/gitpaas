## Why

The backend reports the readiness of its critical dependencies and the state of the Docker daemon, and no
screen shows either. An operator who opens `/server` sees the four actions of the maintenance and nothing
about the server itself. When a removal then fails with "Could not reach the server Docker daemon", the
operator learns of the failure only after the attempt.

The capability `server` records this gap today, in a requirement written as the state of today. This
change closes it.

## What Changes

The screen `/server` gains a panel of the health, above the maintenance.

- The panel shows one line per critical dependency — PostgreSQL and the Docker daemon — with the state `up`
  or `down`.
- The panel shows an aggregate state, so the operator reads one mark instead of two lines.
- The panel shows the information that the Docker daemon reports, when the daemon answers.
- The panel handles the answer `503` of the two endpoints as data, and not as a failure of the screen. A
  dependency that is down is the case that the panel exists for.
- The panel reads the two endpoints one time, when the screen opens.

No endpoint changes. No behavior of the backend changes.

## Capabilities

### New Capabilities

None. The screen `/server` belongs to the capability `server`, which already exists.

### Modified Capabilities

- `server`: the requirement *The screen shows no state of the server* goes away, and the requirements of
  the panel of the health replace it.

## Impact

**The frontend only.**

- `apps/frontend/src/app/features/server/domain/models/` — two new models: the result of the readiness and
  the state of the daemon.
- `apps/frontend/src/app/features/server/infrastructure/api/server-api.repository.ts` — two new reads.
- `apps/frontend/src/app/features/server/ui/components/` — a new presentational component of the panel.
- `apps/frontend/src/app/pages/server/server.component.html` — the panel enters above the maintenance.

**No change of the backend.** `GET /api/v1/server/readiness` and `GET /api/v1/server/status` both exist, and
the capability `server` describes them.

**No new dependency, and no migration.**
