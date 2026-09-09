-- `domains."origin"` — where a domain of a service comes from.
--
-- A domain carries the value `user` when a person claimed it from the tab `Domains`, and the
-- value `compose` when the key `x-gitpaas-domain` of the compose file of the service declares
-- it. A deployment reconciles the record of the origin `compose` with the declaration, and it
-- never touches the record of the origin `user`.
--
-- Every existing record takes `user`, because the tab was the only way to claim a domain.

ALTER TABLE "domains" ADD COLUMN IF NOT EXISTS "origin" text NOT NULL DEFAULT 'user';
