import type { DependencyState } from '@gitpaas/contracts';
import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';

import { HealthProbe } from '../../domain/ports/health-probe.port';

/**
 * PostgreSQL health probe.
 *
 * Probes the database with a trivial `SELECT 1`, reporting `down` on any error.
 */
@Injectable()
export class PostgresHealthProbeAdapter implements HealthProbe {
    public readonly name = 'postgres';

    constructor(private readonly dataSource: DataSource) {}

    /**
     * Probes PostgreSQL connectivity.
     *
     * @returns `up` when the query succeeds, `down` otherwise
     */
    public async check(): Promise<DependencyState> {
        try {
            await this.dataSource.query('SELECT 1');

            return 'up';
        } catch {
            return 'down';
        }
    }
}
