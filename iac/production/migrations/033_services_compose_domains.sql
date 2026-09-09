-- `services."composeDomains"` — the cache of the key `x-gitpaas-domain` of the compose file of a service.
--
-- A compose service declares the domain that reaches it inside its key `x-gitpaas-domain`,
-- which carries the host, the port and the flag `https`. GitPaaS reads the compose file of
-- the repository of a service and keeps every declaration it holds, with the name of the
-- compose service that carries it and the moment of that read.
--
-- The column stays nullable: a service that carries no provider, no path of a compose file,
-- or that GitPaaS never read yet, holds no cache at all. The shape of the value is
-- `{"domains": [{"targetService": "web", "host": "app.example.com", "port": 8080, "https": true}],
--   "refreshedAt": "2026-01-01T00:00:00.000Z"}`.

ALTER TABLE "services" ADD COLUMN IF NOT EXISTS "composeDomains" jsonb;
