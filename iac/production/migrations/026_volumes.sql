-- `volumes` and `service_volumes` — the data of a service that survives its containers.
--
-- One row of `volumes` holds one volume that belongs to one service. The column `name`
-- carries the display name that the user gives, and it is unique inside the service
-- alone. The column `daemonKey` carries the key of the volume inside the Compose file
-- of the service, and it is unique inside the service too, because Compose prefixes
-- that key with the name of the project when it creates the volume on the daemon. The
-- column `origin` says whether GitPaaS created the volume, `gitpaas`, or whether the
-- Compose file of the service declares it, `compose`. The state of a volume —
-- `mounted`, `pending`, `missing`, `declared` or `orphan` — is no column, because it
-- comes from the comparison of the row with the daemon at the read.
--
-- One row of `service_volumes` mounts one volume inside one service of the Compose file
-- of the stack, at the path `containerPath` and under the mode that `readOnly` gives.
-- The pair of the service and the volume is the primary key, so a service mounts one
-- volume one time alone. Every foreign key removes the rows when the service or the
-- volume goes away.

CREATE TABLE IF NOT EXISTS "volumes" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "serviceId" uuid NOT NULL, "name" text NOT NULL, "daemonKey" text NOT NULL, "origin" text NOT NULL DEFAULT 'gitpaas', CONSTRAINT "PK_volumes_id" PRIMARY KEY ("id"), CONSTRAINT "FK_volumes_serviceId" FOREIGN KEY ("serviceId") REFERENCES "services"("id") ON DELETE CASCADE);

CREATE UNIQUE INDEX IF NOT EXISTS "UQ_volumes_serviceId_name" ON "volumes" ("serviceId", "name");

CREATE UNIQUE INDEX IF NOT EXISTS "UQ_volumes_serviceId_daemonKey" ON "volumes" ("serviceId", "daemonKey");

CREATE TABLE IF NOT EXISTS "service_volumes" ("serviceId" uuid NOT NULL, "volumeId" uuid NOT NULL, "containerPath" text NOT NULL, "readOnly" boolean NOT NULL DEFAULT false, "composeServiceName" text NOT NULL, CONSTRAINT "PK_service_volumes_serviceId_volumeId" PRIMARY KEY ("serviceId", "volumeId"), CONSTRAINT "FK_service_volumes_serviceId" FOREIGN KEY ("serviceId") REFERENCES "services"("id") ON DELETE CASCADE, CONSTRAINT "FK_service_volumes_volumeId" FOREIGN KEY ("volumeId") REFERENCES "volumes"("id") ON DELETE CASCADE);

CREATE INDEX IF NOT EXISTS "IDX_service_volumes_volumeId" ON "service_volumes" ("volumeId");
