import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { UserDbEntity } from './infrastructure/database/user-db.entity';
import { UsersDatabaseRepository } from './infrastructure/database/users-db.repository';
import { UsersService } from './ui/services/users.service';

/**
 * Users feature module.
 *
 * Owns the {@link UserDbEntity} persistence and the users repository, and
 * exports the repository so related features (e.g. authentication) can consume
 * it. Users never depends on those features.
 */
@Module({
    imports: [TypeOrmModule.forFeature([UserDbEntity])],
    providers: [UsersDatabaseRepository, UsersService],
    exports: [UsersDatabaseRepository, UsersService, TypeOrmModule],
})
export class UsersModule {}
