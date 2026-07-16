import { DeploymentDbEntity } from '../deployment-db.entity';
import { toDeployment } from '../deployments-db.transformer';

describe('toDeployment', () => {
    it('maps every deployment entity field into the domain model', () => {
        const createdAt = new Date('2026-07-11T00:00:00.000Z');
        const finishedAt = new Date('2026-07-11T00:05:00.000Z');
        const entity: DeploymentDbEntity = {
            id: 'd-1',
            serviceId: 's-1',
            status: 'success',
            branch: 'main',
            commit: '2b8c1f0a9e4d7c6b5a4f3e2d1c0b9a8f7e6d5c4b',
            commitMessage: 'Fix healthcheck parsing',
            composerPath: 'docker-compose.yml',
            triggeredBy: 'system',
            error: null,
            createdAt,
            finishedAt,
        };

        expect(toDeployment(entity)).toEqual({
            id: 'd-1',
            serviceId: 's-1',
            status: 'success',
            branch: 'main',
            commit: '2b8c1f0a9e4d7c6b5a4f3e2d1c0b9a8f7e6d5c4b',
            commitMessage: 'Fix healthcheck parsing',
            composerPath: 'docker-compose.yml',
            triggeredBy: 'system',
            error: null,
            createdAt,
            finishedAt,
        });
    });

    it('preserves nullable commit, commitMessage, error and finishedAt fields', () => {
        const createdAt = new Date('2026-07-11T00:00:00.000Z');
        const entity: DeploymentDbEntity = {
            id: 'd-2',
            serviceId: 's-2',
            status: 'failed',
            branch: 'develop',
            commit: null,
            commitMessage: null,
            composerPath: 'docker-compose.yml',
            triggeredBy: 'webhook',
            error: 'deploy crashed',
            createdAt,
            finishedAt: null,
        };

        expect(toDeployment(entity)).toEqual({
            id: 'd-2',
            serviceId: 's-2',
            status: 'failed',
            branch: 'develop',
            commit: null,
            commitMessage: null,
            composerPath: 'docker-compose.yml',
            triggeredBy: 'webhook',
            error: 'deploy crashed',
            createdAt,
            finishedAt: null,
        });
    });
});
