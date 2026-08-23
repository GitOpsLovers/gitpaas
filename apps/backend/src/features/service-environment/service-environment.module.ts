import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { DbServiceVariableEntity } from './infrastructure/database/db-service-variable.entity';
import { DatabaseServiceVariablesRepository } from './infrastructure/database/db-service-variables.repository';
import { ServiceVariablesController } from './ui/controllers/service-variables.controller';
import { ServiceVariablesService } from './ui/services/service-variables.service';

/**
 * Service environment feature module.
 */
@Module({
    imports: [TypeOrmModule.forFeature([DbServiceVariableEntity])],
    controllers: [ServiceVariablesController],
    providers: [
        ServiceVariablesService,
        DatabaseServiceVariablesRepository,
    ],
    exports: [DatabaseServiceVariablesRepository],
})
export class ServiceEnvironmentModule {}
