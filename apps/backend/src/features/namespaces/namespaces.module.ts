import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { DbNamespaceEntity } from './infrastructure/database/db-namespace.entity';
import { DatabaseNamespacesRepository } from './infrastructure/database/db-namespaces.repository';
import { NamespacesController } from './ui/controllers/namespaces.controller';
import { NamespacesService } from './ui/services/namespaces.service';

/**
 * Namespaces feature module.
 */
@Module({
    imports: [TypeOrmModule.forFeature([DbNamespaceEntity])],
    controllers: [NamespacesController],
    providers: [
        NamespacesService,
        DatabaseNamespacesRepository,
    ],
})
export class NamespacesModule {}
