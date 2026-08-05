import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { UserDbEntity } from './infrastructure/database/db-user.entity';
import { DatabaseUsersRepository } from './infrastructure/database/db-users.repository';
import { UsersService } from './ui/services/users.service';

/**
 * Users feature module.
 */
@Module({
    imports: [TypeOrmModule.forFeature([UserDbEntity])],
    providers: [DatabaseUsersRepository, UsersService],
    exports: [DatabaseUsersRepository, UsersService, TypeOrmModule],
})
export class UsersModule {}
