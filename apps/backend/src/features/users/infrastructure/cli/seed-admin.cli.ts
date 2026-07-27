import { NestFactory } from '@nestjs/core';

import { UsersService } from '../../ui/services/users.service';

import { SeedAdminCliModule } from './seed-admin-cli.module';

/**
 * One-shot admin seeder for production installs.
 *
 * Provisions the FIRST administrator of a fresh control plane. The production
 * database has `synchronize` disabled and never runs any dev seed hook, so the
 * `users` table is created by the TypeORM migrations (the one-shot `migrate`
 * service) — this script must therefore run AFTER migrations have applied.
 *
 * It runs inside the already-built `gitpaas-backend` image and boots a slim Nest
 * application context ({@link SeedAdminCliModule}) that wires only the TypeORM
 * connection, the users feature and the argon2 hasher — no HTTP layer, guards or
 * Redis/Docker connections. It then resolves the wired {@link UsersService} and
 * delegates to its `seedAdmin` method, the same code path the development
 * bootstrap hook uses. The stored credential is therefore an argon2id hash the
 * app verifies at login, byte-for-byte identical in shape to what the login flow
 * produces.
 *
 * Inputs (environment, supplied by the installer):
 *   ADMIN_EMAIL     — the operator's email (prompted by the installer).
 *   ADMIN_PASSWORD  — a random password (generated + displayed by the installer).
 * Both are required with no fallback: production never seeds default credentials.
 * Database connection is read from the same DB_* vars the app validates at boot.
 *
 * Idempotency: an existing admin is left untouched and its password is NOT
 * rotated. Exit code is always 0 on success, whether the row was created or
 * already existed.
 */
async function run(): Promise<void> {
    const email = process.env.ADMIN_EMAIL?.trim();
    const password = process.env.ADMIN_PASSWORD;

    if (!email) {
        throw new Error('ADMIN_EMAIL is required');
    }
    if (!password) {
        throw new Error('ADMIN_PASSWORD is required');
    }

    const context = await NestFactory.createApplicationContext(SeedAdminCliModule);

    try {
        await context.get(UsersService).seedAdmin({ email, password });
    } finally {
        await context.close();
    }
}

run()
    .then(() => process.exit(0))
    .catch((error: unknown) => {
        console.error('Admin seed failed:', error instanceof Error ? error.message : error);
        process.exit(1);
    });
