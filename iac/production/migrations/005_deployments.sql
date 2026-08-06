-- `deployments` and `deployment_queue_tasks` — deployment runs and their queue.
--
-- `deployments` is the durable record of a run (FK to `services`);
-- `deployment_queue_tasks` is the DB-backed work queue the runner consumes,
-- which references a deployment by id without a database-level constraint (as
-- in the baseline schema).

CREATE TABLE IF NOT EXISTS "deployments" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "serviceId" uuid NOT NULL, "status" text NOT NULL DEFAULT 'pending', "branch" text NOT NULL DEFAULT '', "commit" text, "commitMessage" text, "composerPath" text NOT NULL DEFAULT '', "triggeredBy" text NOT NULL DEFAULT '', "error" text, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "finishedAt" TIMESTAMP WITH TIME ZONE, CONSTRAINT "PK_1e5627acb3c950deb83fe98fc48" PRIMARY KEY ("id"));

CREATE TABLE IF NOT EXISTS "deployment_queue_tasks" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "deploymentId" uuid NOT NULL, "repositoryId" integer NOT NULL, "commit" text NOT NULL, "composerPath" text NOT NULL, "projectName" text NOT NULL, "status" text NOT NULL DEFAULT 'queued', "attempts" integer NOT NULL DEFAULT '0', "lastError" text, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_9c0feddf4ca9a08192bea4bc727" PRIMARY KEY ("id"));

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FK_f083ccb82822f2b3f81bbc891b6') THEN
        ALTER TABLE "deployments" ADD CONSTRAINT "FK_f083ccb82822f2b3f81bbc891b6" FOREIGN KEY ("serviceId") REFERENCES "services"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
    END IF;
END
$$;
