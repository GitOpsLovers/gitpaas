import { join } from 'node:path';

import type { DataSourceOptions } from 'typeorm';

/**
 * Builds the PostgreSQL connection options shared by the NestJS runtime
 * ({@link CoreModule}'s `TypeOrmModule.forRootAsync`) and the standalone
 * TypeORM CLI DataSource (`data-source.ts`), so both agree on a single source
 * of truth for schema and migration wiring.
 *
 * Connection settings come straight from `process.env` — the same variables the
 * app validates at boot (`DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`,
 * `DB_NAME`, `NODE_ENV`).
 *
 * Entities and migrations are registered by GLOB rather than by importing the
 * classes, so no code has to enumerate them. The glob's extension is derived
 * from how this module is being executed:
 *
 * - Compiled (`.js`, i.e. `node dist/...` — production runtime and the compiled
 *   migration runner): matches the emitted `dist/**` JavaScript.
 * - Source (`.ts`, i.e. ts-node — the local migration CLI): matches `src/**`.
 *
 * Because the globs are anchored to this file's own directory (`__dirname`),
 * they resolve correctly whether the process runs from `dist/` or `src/`,
 * without depending on the current working directory.
 *
 * `synchronize` stays on outside production (identical to the previous
 * behaviour, keeping local dev + test unchanged) and is disabled in production,
 * where migrations own the schema. `migrationsRun` is always false: production
 * runs migrations explicitly via a one-shot process, never implicitly at boot.
 *
 * @returns The fully resolved TypeORM `postgres` data source options
 */
export function buildDataSourceOptions(): DataSourceOptions {
    const isProduction = process.env.NODE_ENV === 'production';

    // Are we running compiled JS (dist) or TypeScript source (ts-node)?
    const isCompiled = __filename.endsWith('.js');
    const extension = isCompiled ? 'js' : 'ts';

    // This file lives at <root>/{src|dist/src}/core/infrastructure/database;
    // three levels up is the {src|dist/src} root the globs are anchored to.
    const rootDir = join(__dirname, '..', '..', '..');

    return {
        type: 'postgres',
        host: process.env.DB_HOST,
        port: Number(process.env.DB_PORT),
        username: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        entities: [join(rootDir, '**', `*.entity.${extension}`)],
        migrations: [join(rootDir, 'migrations', `*.${extension}`)],
        // Auto-creates/updates tables outside production; production relies on
        // migrations instead. Keeps dev + test behaviour unchanged.
        synchronize: !isProduction,
        // Migrations are run explicitly (one-shot process), never at app boot.
        migrationsRun: false,
    };
}
