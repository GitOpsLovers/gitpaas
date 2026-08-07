import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { DbProjectEntity } from './infrastructure/database/db-project.entity';
import { DatabaseProjectsRepository } from './infrastructure/database/db-projects.repository';
import { ProjectsController } from './ui/controllers/projects.controller';
import { ProjectsService } from './ui/services/projects.service';

/**
 * Projects feature module.
 */
@Module({
    imports: [TypeOrmModule.forFeature([DbProjectEntity])],
    controllers: [ProjectsController],
    providers: [
        ProjectsService,
        DatabaseProjectsRepository,
    ],
})
export class ProjectsModule {}
