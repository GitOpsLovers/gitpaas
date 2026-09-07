-- `users` — the removal of the role.
--
-- GitPaaS gave a user the role `admin` or the role `user`, and a handful of routes asked a
-- guard whether the role of the caller was `admin`. The platform serves one operator and
-- its team, and every authenticated user holds the same rights, so the layer of the roles
-- gated nothing that the authentication did not already gate. The backend dropped the
-- guard, the decorator, the claim of the token and the field of the contract, so the
-- column no longer feeds any decision.
--
-- The drop uses `IF EXISTS`, so an installation that already ran this file, and an
-- installation whose table never carried the column, both run it without an error.

ALTER TABLE "users" DROP COLUMN IF EXISTS "role";
