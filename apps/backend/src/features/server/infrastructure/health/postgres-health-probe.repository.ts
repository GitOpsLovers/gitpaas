import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';

import { HealthProbe } from '../../domain/repositories/health-probe.repository';

/**
 * PostgreSQL health probe.
 *
 * Probes the database with a trivial `SELECT 1`, reporting `down` on any error.
 */
@Injectable()
export class PostgresHealthProbe implements HealthProbe {
    public readonly name = 'postgres';

    constructor(private readonly dataSource: DataSource) {}

    /**
     * Probes PostgreSQL connectivity.
     *
     * @returns `true` when the query succeeds, `false` otherwise
     */
    public async check(): Promise<boolean> {
        try {
            await this.dataSource.query('SELECT 1');

            return true;
        } catch {
            return false;
        }
    }
}
