import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { ProjectDbEntity } from './infrastructure/database/project-db.entity';
import { ProjectsDatabaseRepository } from './infrastructure/database/projects-db.repository';
import { ProjectsController } from './ui/controllers/projects.controller';
import { ProjectsService } from './ui/services/projects.service';

/**
 * Projects feature module.
 */
@Module({
    imports: [TypeOrmModule.forFeature([ProjectDbEntity])],
    controllers: [ProjectsController],
    providers: [
        ProjectsService,
        ProjectsDatabaseRepository,
    ],
})
export class ProjectsModule {}
