-- `deployments` — the final Compose text of a run.
--
-- A user reads the Compose file of the repository, but GitPaaS rewrites that file before it
-- starts the stack: it stamps the labels of the ownership and of the routing, it declares the
-- default network, it merges the variables of the service, and it turns every build into an
-- image. Nobody could see the result, so a wrong image name or a wrong label stayed invisible.
--
-- The column `finalCompose` holds the text the deployment came up from, as YAML, with the value
-- of every variable replaced by `****`, so no secret of a service leaves the server. The column
-- is nullable, so every row that existed before this file keeps a `NULL`, exactly as the column
-- `error` of `005_deployments.sql` does, and a deployment that never reached the daemon holds
-- no text either. TypeORM declares it with `@Column({ type: 'text', nullable: true })`.

ALTER TABLE "deployments" ADD COLUMN IF NOT EXISTS "finalCompose" text;
