-- Postgres extensions the schema depends on.
--
-- Every table's primary key is `uuid NOT NULL DEFAULT uuid_generate_v4()` (what
-- TypeORM's @PrimaryGeneratedColumn('uuid') expects), and that function comes
-- from uuid-ossp. It must therefore exist before any table is created.

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
