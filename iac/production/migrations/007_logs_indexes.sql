-- `logs` indexes — the read paths of the archive tier of the log store.
--
-- Redis is the hot store of a deployment that runs; PostgreSQL is the cold
-- archive, which receives the whole log once, when the run ends. This table
-- serves the replay of a finished deployment and the age sweep that limits its
-- growth. Both need an index:
--
--   * ("deploymentId", "seq") — ordered replay of one deployment's stream and
--     the per-deployment line-cap trim.
--   * ("createdAt")           — the age-based retention sweep.
--
-- The names are the ones TypeORM's default naming strategy derives for the same
-- indexes, so `synchronize` in development produces an identical schema.

CREATE INDEX IF NOT EXISTS "IDX_c9b8b647032955d40415fdd7c6" ON "logs" ("deploymentId", "seq");

CREATE INDEX IF NOT EXISTS "IDX_1d21181bfc9b5cc798be90d723" ON "logs" ("createdAt");
