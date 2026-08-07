import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { DbUserEntity } from './infrastructure/database/db-user.entity';
import { DatabaseUsersRepository } from './infrastructure/database/db-users.repository';
import { UsersService } from './ui/services/users.service';

/**
 * Users feature module.
 */
@Module({
    imports: [TypeOrmModule.forFeature([DbUserEntity])],
    providers: [DatabaseUsersRepository, UsersService],
    exports: [DatabaseUsersRepository, UsersService, TypeOrmModule],
})
export class UsersModule {}
