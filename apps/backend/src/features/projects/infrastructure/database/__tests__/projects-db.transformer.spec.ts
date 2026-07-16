import { ProjectDbEntity } from '../project-db.entity';
import { toProject } from '../projects-db.transformer';

import { ServiceDbEntity } from '@features/services/infrastructure/database/service-db.entity';

describe('toProject', () => {
    it('maps the entity fields and derives servicesCount from the loaded relation', () => {
        const entity: ProjectDbEntity = {
            id: 'p-1',
            name: 'Artifactory',
            services: [{} as ServiceDbEntity, {} as ServiceDbEntity, {} as ServiceDbEntity],
        };

        expect(toProject(entity)).toEqual({
            id: 'p-1',
            name: 'Artifactory',
            servicesCount: 3,
        });
    });

    it('defaults servicesCount to 0 when the services relation is undefined (not loaded)', () => {
        const entity: ProjectDbEntity = { id: 'p-2', name: 'No relation' };

        expect(toProject(entity)).toEqual({
            id: 'p-2',
            name: 'No relation',
            servicesCount: 0,
        });
    });

    it('derives servicesCount of 0 for an empty loaded relation', () => {
        const entity: ProjectDbEntity = { id: 'p-3', name: 'Empty', services: [] };

        expect(toProject(entity)).toEqual({
            id: 'p-3',
            name: 'Empty',
            servicesCount: 0,
        });
    });
});
