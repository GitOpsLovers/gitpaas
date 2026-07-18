import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { UserDbEntity } from './infrastructure/database/user-db.entity';
import { UsersDatabaseRepository } from './infrastructure/database/users-db.repository';

/**
 * Users feature module.
 *
 * Owns the {@link UserDbEntity} persistence and the users repository, and
 * exports the repository so related features (e.g. authentication) can consume
 * it. Users never depends on those features.
 */
@Module({
    imports: [TypeOrmModule.forFeature([UserDbEntity])],
    providers: [UsersDatabaseRepository],
    exports: [UsersDatabaseRepository, TypeOrmModule],
})
export class UsersModule {}
