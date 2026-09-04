-- `deployment_queue_tasks` — the service a queued deployment belongs to.
--
-- The runner serialized its queue by the name of the compose project. That name now groups
-- every service of one project, so two unrelated services of one project would wait on each
-- other. The row now carries the identifier of its service, and the runner serializes on it,
-- so the deployments of one service still run one after the other and the deployments of two
-- services run side by side.
--
-- A row that predates this file is backfilled from its deployment. A row whose deployment no
-- longer exists carries no service, so it cannot be run: it is deleted, and the deployment it
-- pointed at is gone anyway.

ALTER TABLE "deployment_queue_tasks" ADD COLUMN IF NOT EXISTS "serviceId" uuid;

UPDATE "deployment_queue_tasks" AS t
SET "serviceId" = d."serviceId"
FROM "deployments" AS d
WHERE d."id" = t."deploymentId" AND t."serviceId" IS NULL;

DELETE FROM "deployment_queue_tasks" WHERE "serviceId" IS NULL;

ALTER TABLE "deployment_queue_tasks" ALTER COLUMN "serviceId" SET NOT NULL;
