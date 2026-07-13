import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { ServiceDbEntity } from './infrastructure/database/service-db.entity';
import { ServicesDatabaseRepository } from './infrastructure/database/services-db.repository';
import { ServicesController } from './ui/controllers/services.controller';
import { ServicesService } from './ui/services/services.service';

/**
 * Services feature module.
 */
@Module({
    imports: [TypeOrmModule.forFeature([ServiceDbEntity])],
    controllers: [ServicesController],
    providers: [
        ServicesService,
        ServicesDatabaseRepository,
    ],
    exports: [ServicesDatabaseRepository],
})
export class ServicesModule {}
