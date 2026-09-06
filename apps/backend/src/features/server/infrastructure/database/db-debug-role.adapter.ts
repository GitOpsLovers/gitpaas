import { randomBytes } from 'node:crypto';

import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';

import { DEBUG_ROLE_NAME } from '../../domain/constants/database-debug.constants';
import type { DebugRole, DebugRoleCredentials } from '../../domain/ports/debug-role.port';

/**
 * The number of random bytes the generated password of the role carries.
 */
const PASSWORD_BYTES = 24;

/**
 * PostgreSQL debug role adapter.
 */
@Injectable()
export class DatabaseDebugRoleAdapter implements DebugRole {
    constructor(private readonly dataSource: DataSource) {}

    public async grantLogin(): Promise<DebugRoleCredentials> {
        const password = randomBytes(PASSWORD_BYTES).toString('hex');

        await this.dataSource.query(`ALTER ROLE "${DEBUG_ROLE_NAME}" WITH LOGIN PASSWORD '${password}'`);

        return { role: DEBUG_ROLE_NAME, password };
    }

    public async revokeLogin(): Promise<void> {
        await this.dataSource.query(`ALTER ROLE "${DEBUG_ROLE_NAME}" WITH NOLOGIN`);
    }
}
