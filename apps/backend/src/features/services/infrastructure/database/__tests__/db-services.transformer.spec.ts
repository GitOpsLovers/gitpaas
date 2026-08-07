import { DbServiceEntity } from '../db-service.entity';
import { toService } from '../db-services.transformer';

describe('toService', () => {
    it('maps every service entity field into the domain model', () => {
        const entity: DbServiceEntity = {
            id: 's-1',
            name: 'api',
            projectId: 'p-1',
            repositoryId: 'gitopslovers/api',
            deploymentBranch: 'main',
            composerPath: 'docker-compose.yml',
        };

        expect(toService(entity)).toEqual({
            id: 's-1',
            name: 'api',
            projectId: 'p-1',
            repositoryId: 'gitopslovers/api',
            deploymentBranch: 'main',
            composerPath: 'docker-compose.yml',
        });
    });

    it('preserves empty-string defaults for optional persistence columns', () => {
        const entity: DbServiceEntity = {
            id: 's-2',
            name: 'web',
            projectId: 'p-2',
            repositoryId: '',
            deploymentBranch: '',
            composerPath: '',
        };

        expect(toService(entity)).toEqual({
            id: 's-2',
            name: 'web',
            projectId: 'p-2',
            repositoryId: '',
            deploymentBranch: '',
            composerPath: '',
        });
    });
});
