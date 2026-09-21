-- `deployments` — the start of a run.
--
-- `createdAt` marks the moment a user triggers a deployment, and the deployment then waits in the
-- queue. The duration of the run alone needs the moment the runner picks it up, so the column
-- `startedAt` holds the moment the deployment changes to the state `running`.
--
-- The column is nullable, so every row that existed before this file keeps a `NULL`, exactly as
-- the column `finishedAt` of `005_deployments.sql` does, and a deployment that never left the
-- queue holds no moment either. TypeORM declares it with
-- `@Column({ type: 'timestamptz', nullable: true })`.

ALTER TABLE "deployments" ADD COLUMN IF NOT EXISTS "startedAt" TIMESTAMP WITH TIME ZONE;
