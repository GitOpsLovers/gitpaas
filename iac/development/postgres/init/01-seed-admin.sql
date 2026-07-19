-- Local-development admin seeding.
--
-- The standard Postgres image runs every *.sql / *.sh under
-- /docker-entrypoint-initdb.d ONCE, the first time it initializes an empty data
-- directory (i.e. a fresh `postgres-data` volume). This script provisions the
-- initial admin user so a developer never has to run a manual seed step after
-- bringing the local database up for the first time.
--
-- Credentials seeded here:
--   email:    admin@gitpaas.dev
--   password: gitpaas   (plaintext dev password)
-- The stored value is an argon2id hash — generated with the backend's own
-- Argon2PasswordHasher options ({ type: argon2id }, argon2 defaults:
-- v=19, m=65536, t=3, p=4) — so the app can verify it at login.
--
-- Why create the table here? The backend runs on the host and builds its schema
-- via TypeORM `synchronize` on boot, so at DB-init time the `users` table does
-- not exist yet. We therefore CREATE TABLE IF NOT EXISTS with a schema identical
-- to `UserDbEntity` (no naming strategy is configured, so TypeORM keeps the
-- camelCase property names as quoted identifiers). Matching TypeORM's generated
-- form avoids `synchronize` trying to ALTER the table when the app boots.
--
-- Idempotency: this file only runs on a FRESH volume, and the INSERT uses
-- ON CONFLICT (email) DO NOTHING. To re-seed after the fact, recreate the
-- `postgres-data` volume (`docker compose down -v`) so this script runs again.

-- TypeORM's PrimaryGeneratedColumn('uuid') defaults to uuid_generate_v4(), which
-- needs the uuid-ossp extension. synchronize would create it too; do it here so
-- the DEFAULT matches and no drift occurs.
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS "users" (
    "id"           uuid                     NOT NULL DEFAULT uuid_generate_v4(),
    "email"        text                     NOT NULL,
    "passwordHash" text                     NOT NULL,
    "role"         text                     NOT NULL DEFAULT 'user',
    "isActive"     boolean                  NOT NULL DEFAULT true,
    "createdAt"    timestamp with time zone NOT NULL DEFAULT now(),
    "updatedAt"    timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT "PK_users_id" PRIMARY KEY ("id"),
    CONSTRAINT "UQ_users_email" UNIQUE ("email")
);

INSERT INTO "users" ("email", "passwordHash", "role", "isActive", "createdAt", "updatedAt")
VALUES (
    'admin@gitpaas.dev',
    '$argon2id$v=19$m=65536,t=3,p=4$Psd8kXOF/34Yt98WwaM1hQ$4M1h8fjsYHd2agG3P8KTNZzw8qj4AaSwflT8+oRxsXY',
    'admin',
    true,
    now(),
    now()
)
ON CONFLICT ("email") DO NOTHING;
