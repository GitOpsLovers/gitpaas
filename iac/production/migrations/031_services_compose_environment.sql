-- `services."composeEnvironment"` — the cache of the key `environment` of the compose file of a service.
--
-- GitPaaS reads the compose file of the repository of a service and keeps the names it
-- declares, their literal values and the moment of that read. The tab Environment shows
-- those names, so the user stops guessing which variable the compose file injects.
--
-- The column stays nullable: a service that carries no provider, no path of a compose
-- file, or that GitPaaS never read yet, holds no cache at all. The shape of the value is
-- `{"variables": {"NAME": "value"}, "refreshedAt": "2026-01-01T00:00:00.000Z"}`.

ALTER TABLE "services" ADD COLUMN IF NOT EXISTS "composeEnvironment" jsonb;
