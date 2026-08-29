-- `project_networks` and `service_networks` — the private network of a project.
--
-- One row of `project_networks` holds one network that belongs to one project. The
-- column `name` carries the display name that the user gives, and it is unique inside
-- the project alone. The column `daemonName` carries the name that the network takes
-- on the Docker daemon, `gitpaas-<projectId>-<networkId>`, and it is unique across the
-- whole installation. The state of a network — `ready`, `missing` or `orphan` — is no
-- column, because it comes from the comparison of the row with the daemon at the read.
--
-- One row of `service_networks` joins one service to one network of its project, so a
-- service joins a network by choice. The pair is the primary key, so a service joins a
-- network one time alone. Every foreign key removes the rows when the project, the
-- service or the network goes away.

CREATE TABLE IF NOT EXISTS "project_networks" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "projectId" uuid NOT NULL, "name" text NOT NULL, "daemonName" text NOT NULL, CONSTRAINT "PK_project_networks_id" PRIMARY KEY ("id"), CONSTRAINT "FK_project_networks_projectId" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE);

CREATE UNIQUE INDEX IF NOT EXISTS "UQ_project_networks_projectId_name" ON "project_networks" ("projectId", "name");

CREATE UNIQUE INDEX IF NOT EXISTS "UQ_project_networks_daemonName" ON "project_networks" ("daemonName");

CREATE TABLE IF NOT EXISTS "service_networks" ("serviceId" uuid NOT NULL, "networkId" uuid NOT NULL, CONSTRAINT "PK_service_networks_serviceId_networkId" PRIMARY KEY ("serviceId", "networkId"), CONSTRAINT "FK_service_networks_serviceId" FOREIGN KEY ("serviceId") REFERENCES "services"("id") ON DELETE CASCADE, CONSTRAINT "FK_service_networks_networkId" FOREIGN KEY ("networkId") REFERENCES "project_networks"("id") ON DELETE CASCADE);

CREATE INDEX IF NOT EXISTS "IDX_service_networks_networkId" ON "service_networks" ("networkId");
