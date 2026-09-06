-- `gitpaas_debug` — the role that a session of the debug of the database reads through.
--
-- The role holds no password and it carries `NOLOGIN`, so it opens no connection while
-- an operator starts no session. The start of a session writes a generated password and
-- it grants `LOGIN`, and the stop of the session sets `NOLOGIN` again; the backend owns
-- those two statements alone, and it runs no other statement of the definition.
--
-- The role reads and it never writes: it takes `CONNECT` on the database of the platform,
-- `USAGE` on the schema `public` and `SELECT` on its tables, and nothing else. The setting
-- `default_transaction_read_only` opens every transaction of the role in the read-only
-- mode, so a write fails even where a grant of a later migration would allow it. The
-- default privileges carry the same `SELECT` to the tables that a later migration creates,
-- so no migration has to remember this role.

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM "pg_roles" WHERE "rolname" = 'gitpaas_debug') THEN
        CREATE ROLE "gitpaas_debug" WITH NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOREPLICATION NOBYPASSRLS;
    END IF;
END
$$;

ALTER ROLE "gitpaas_debug" SET "default_transaction_read_only" = on;

-- The name of the database comes from the environment of the installation, so the grant
-- of the connection is built with the name that the migration runs against.
DO $$
BEGIN
    EXECUTE format('GRANT CONNECT ON DATABASE %I TO %I', current_database(), 'gitpaas_debug');
END
$$;

GRANT USAGE ON SCHEMA "public" TO "gitpaas_debug";

GRANT SELECT ON ALL TABLES IN SCHEMA "public" TO "gitpaas_debug";

ALTER DEFAULT PRIVILEGES IN SCHEMA "public" GRANT SELECT ON TABLES TO "gitpaas_debug";
