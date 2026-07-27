import { Module } from '@nestjs/common';

import { CoreModule } from '@core/core.module';
import { UsersModule } from '@features/users/users.module';

/**
 * Slim Nest module for the one-shot admin seed CLI.
 *
 * It imports only what is needed to resolve {@link UsersService}:
 * {@link CoreModule} provides the validated environment/config, the TypeORM root
 * connection and the argon2 {@link Argon2PasswordHasher}, and {@link UsersModule}
 * provides the service and users repository.
 *
 * It deliberately does NOT pull in the HTTP layer, the global auth/throttler
 * guards, JWT/Passport or the full {@link AppModule}, so booting the CLI only
 * needs Postgres (the Redis/Docker clients wired by {@link CoreModule} connect
 * lazily and are never touched here).
 */
@Module({
    imports: [CoreModule, UsersModule],
})
export class SeedAdminCliModule {}
