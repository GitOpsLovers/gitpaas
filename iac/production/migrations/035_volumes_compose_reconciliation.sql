-- `volumes` and `service_volumes` — the compose file of a service is the one source of truth of its volumes.
--
-- GitPaaS writes no volume any more: it neither creates one, nor renames one, nor attaches one, nor
-- detaches one. A deployment reconciles the two tables with the named volumes the compose file of the
-- commit declares, so it records the volume the compose file declares, it caches the path of the mount
-- that compose file gives it, and it deletes the row the compose file no longer declares.
--
-- Every row of `service_volumes` comes from an attach of the tab, and no read of a compose file ever
-- wrote one, so every one of them is stale. The next deployment of the service writes the mounts again.
--
-- Every row of `volumes` of the origin `gitpaas` comes from the tab too: its key names no volume of the
-- compose file, and the reconciliation owns none of them. The row of the origin `compose` carries the
-- key of the compose file, so the reconciliation owns it, and it stays. The column `origin` then holds
-- one value alone, and it goes away.
--
-- No volume of the daemon goes away with these rows: Docker Compose creates and holds them, and the
-- data of a service survives this migration untouched.

DELETE FROM "service_volumes";

DELETE FROM "volumes" WHERE "origin" <> 'compose';

ALTER TABLE "volumes" DROP COLUMN IF EXISTS "origin";
