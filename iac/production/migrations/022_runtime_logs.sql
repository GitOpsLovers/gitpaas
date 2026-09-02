-- `runtime_logs` — the persisted lines that a running container writes.
--
-- The feature of the runtime logs arrived with the entity `DbRuntimeLogEntity`
-- alone, and with no SQL file. In production `buildDataSourceOptions` sets
-- `synchronize: false`, so TypeORM created no table, and every call of
-- `GET /api/v1/logs/runtime` failed on a relation that does not exist.
--
-- The table serves two read paths, and each one takes an index:
--
--   * ("containerId", "timestamp") — the window of one container, in order.
--   * ("createdAt")                — the age-based retention sweep.
--
-- The names of the primary key and of the indexes are the ones that TypeORM's
-- default naming strategy derives for this entity, so `synchronize` in
-- development produces an identical schema. The project registers no naming
-- strategy, so a camel case property keeps its camel case in SQL.

CREATE TABLE IF NOT EXISTS "runtime_logs" ("id" BIGSERIAL NOT NULL, "containerId" character varying(64) NOT NULL, "timestamp" TIMESTAMP WITH TIME ZONE NOT NULL, "source" text NOT NULL, "text" text NOT NULL, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_ddd084545c7dea38d24d5999cc4" PRIMARY KEY ("id"));

CREATE INDEX IF NOT EXISTS "IDX_c358c84a5276e41ed8896aa6ae1" ON "runtime_logs" ("containerId", "timestamp");

CREATE INDEX IF NOT EXISTS "IDX_406c36631e4fbab4b18258c2dc5" ON "runtime_logs" ("createdAt");
