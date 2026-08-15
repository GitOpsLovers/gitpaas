import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { DbProviderEntity } from './infrastructure/database/db-provider.entity';
import { DatabaseProvidersRepository } from './infrastructure/database/db-providers.repository';
import { ProvidersController } from './ui/controllers/providers.controller';
import { ProvidersService } from './ui/services/providers.service';

import { SourceControlModule } from '@features/source-control/source-control.module';

/**
 * Providers feature module.
 */
@Module({
    imports: [
        TypeOrmModule.forFeature([DbProviderEntity]),
        SourceControlModule,
    ],
    controllers: [ProvidersController],
    providers: [
        ProvidersService,
        DatabaseProvidersRepository,
    ],
    exports: [DatabaseProvidersRepository],
})
export class ProvidersModule {}
