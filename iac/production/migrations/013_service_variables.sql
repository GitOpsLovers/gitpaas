-- `service_variables` — the environment of a service.
--
-- One row holds one name and one value that the containers of the service read when
-- the stack starts. The column `secret` marks the rows whose `value` is not clear
-- text but a payload sealed by AES-256-GCM under `SECRETS_ENCRYPTION_KEY`, exactly as
-- the `providers` table of `010_providers.sql` holds a private key. No answer of the
-- API carries the value of a secret. The name is unique inside one service, so two
-- services can hold the same name. The foreign key removes the variables of a service
-- when the service goes away.

CREATE TABLE IF NOT EXISTS "service_variables" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "serviceId" uuid NOT NULL, "name" text NOT NULL, "value" text NOT NULL DEFAULT '', "secret" boolean NOT NULL DEFAULT false, CONSTRAINT "PK_service_variables_id" PRIMARY KEY ("id"), CONSTRAINT "FK_service_variables_serviceId" FOREIGN KEY ("serviceId") REFERENCES "services"("id") ON DELETE CASCADE);

CREATE UNIQUE INDEX IF NOT EXISTS "UQ_service_variables_serviceId_name" ON "service_variables" ("serviceId", "name");
