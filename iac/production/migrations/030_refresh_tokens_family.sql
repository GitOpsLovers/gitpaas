-- `refresh_tokens` — the family of a chain of rotations.
--
-- A login opens a family, and every rotation of that login carries its identifier. When a
-- token that an earlier rotation already revoked comes back, the refresh revokes the whole
-- family, so a stolen token that a thief replays closes the session of the victim instead of
-- opening a new one.
--
-- A row that exists already becomes the head of its own family, so its identifier takes the
-- value of its `jti`. The column then turns into `NOT NULL`, and its index serves the
-- revocation of a family.

ALTER TABLE "refresh_tokens" ADD COLUMN IF NOT EXISTS "familyId" uuid;

UPDATE "refresh_tokens" SET "familyId" = "jti" WHERE "familyId" IS NULL;

ALTER TABLE "refresh_tokens" ALTER COLUMN "familyId" SET NOT NULL;

CREATE INDEX IF NOT EXISTS "IDX_refresh_tokens_family_id" ON "refresh_tokens" ("familyId");
