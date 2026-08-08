-- `logs` indexes — the read paths of the database-backed log store.
--
-- The log store now streams a deployment straight out of this table (replay)
-- before switching to the live in-process feed, and prunes it to keep the old
-- Redis buffer's effective retention. Both need an index:
--
--   * ("deploymentId", "seq") — ordered replay of one deployment's stream and
--     the per-deployment line-cap trim.
--   * ("createdAt")           — the age-based retention sweep.
--
-- The names are the ones TypeORM's default naming strategy derives for the same
-- indexes, so `synchronize` in development produces an identical schema.

CREATE INDEX IF NOT EXISTS "IDX_c9b8b647032955d40415fdd7c6" ON "logs" ("deploymentId", "seq");

CREATE INDEX IF NOT EXISTS "IDX_1d21181bfc9b5cc798be90d723" ON "logs" ("createdAt");
