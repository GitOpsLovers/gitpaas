import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { DatabaseComposeEnvironmentCacheAdapter } from './infrastructure/database/db-compose-environment-cache.adapter';
import { DbServiceVariableEntity } from './infrastructure/database/db-service-variable.entity';
import { DatabaseServiceVariablesRepository } from './infrastructure/database/db-service-variables.repository';
import { ServiceVariablesController } from './ui/controllers/service-variables.controller';
import { ServiceVariablesService } from './ui/services/service-variables.service';

import { DbServiceEntity } from '@features/services/infrastructure/database/db-service.entity';

/**
 * Service environment feature module.
 */
@Module({
    imports: [TypeOrmModule.forFeature([DbServiceVariableEntity, DbServiceEntity])],
    controllers: [ServiceVariablesController],
    providers: [
        ServiceVariablesService,
        DatabaseServiceVariablesRepository,
        DatabaseComposeEnvironmentCacheAdapter,
    ],
    exports: [DatabaseServiceVariablesRepository],
})
export class ServiceEnvironmentModule {}
