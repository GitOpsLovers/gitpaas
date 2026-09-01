import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { DbUserEntity } from './infrastructure/database/db-user.entity';
import { DatabaseUsersRepository } from './infrastructure/database/db-users.repository';
import { UsersController } from './ui/controllers/users.controller';
import { UsersService } from './ui/services/users.service';

import { SharedModule } from '@shared/shared.module';

/**
 * Users feature module.
 */
@Module({
    imports: [TypeOrmModule.forFeature([DbUserEntity]), SharedModule],
    controllers: [UsersController],
    providers: [DatabaseUsersRepository, UsersService],
    exports: [DatabaseUsersRepository, UsersService, TypeOrmModule],
})
export class UsersModule {}
