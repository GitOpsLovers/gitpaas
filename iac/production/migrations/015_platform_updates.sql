-- `platform_updates` — the state of one run of the update of the platform.
--
-- One row holds one update: the version it moves the installation to, the step it
-- reached, how far along it is, its state, and the reason of a failure. The backend
-- opens the row before it starts the container of the update, and `scripts/update.sh`
-- writes the rest of the progress into it with `psql`, so the frontend follows the
-- update while the backend container is replaced. `startedAt` orders the rows, so the
-- read of the state always takes the newest one.

CREATE TABLE IF NOT EXISTS "platform_updates" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "targetVersion" text NOT NULL, "step" text NOT NULL DEFAULT 'starting', "percent" integer NOT NULL DEFAULT 0, "state" text NOT NULL DEFAULT 'running', "error" text, "startedAt" timestamptz NOT NULL DEFAULT now(), CONSTRAINT "PK_platform_updates_id" PRIMARY KEY ("id"));

CREATE INDEX IF NOT EXISTS "IDX_platform_updates_startedAt" ON "platform_updates" ("startedAt" DESC);
