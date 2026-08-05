import { join } from 'node:path';

import type { DataSourceOptions } from 'typeorm';

/**
 * Builds the PostgreSQL connection options used by the NestJS runtime
 *
 * @returns The fully resolved TypeORM `postgres` data source options
 */
export function buildDataSourceOptions(): DataSourceOptions {
    const isProduction = process.env.NODE_ENV === 'production';

    const isCompiled = __filename.endsWith('.js');
    const extension = isCompiled ? 'js' : 'ts';
    const rootDir = join(__dirname, '..', '..', '..');

    return {
        type: 'postgres',
        host: process.env.DB_HOST,
        port: Number(process.env.DB_PORT),
        username: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        entities: [join(rootDir, '**', `*.entity.${extension}`)],
        synchronize: !isProduction,
    };
}
