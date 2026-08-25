-- `domains` — the public address of a service.
--
-- One row holds one public host, the compose service it reaches, the port of that
-- compose service, and the choice of HTTPS. A host belongs to one service alone, so
-- the unique index covers the whole installation and not one service, exactly as the
-- rule of the claim states. The column `certificateState` follows the certificate of
-- Let's Encrypt: `none` when the domain answers on HTTP alone, then `pending`,
-- `ready` or `failed`, and `certificateError` carries the reason of a failure. The
-- foreign key removes the domains of a service when the service goes away.

CREATE TABLE IF NOT EXISTS "domains" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "serviceId" uuid NOT NULL, "host" text NOT NULL, "targetService" text NOT NULL, "port" integer NOT NULL, "https" boolean NOT NULL DEFAULT false, "certificateState" text NOT NULL DEFAULT 'none', "certificateError" text, CONSTRAINT "PK_domains_id" PRIMARY KEY ("id"), CONSTRAINT "FK_domains_serviceId" FOREIGN KEY ("serviceId") REFERENCES "services"("id") ON DELETE CASCADE);

CREATE UNIQUE INDEX IF NOT EXISTS "UQ_domains_host" ON "domains" ("host");

CREATE INDEX IF NOT EXISTS "IDX_domains_serviceId" ON "domains" ("serviceId");
