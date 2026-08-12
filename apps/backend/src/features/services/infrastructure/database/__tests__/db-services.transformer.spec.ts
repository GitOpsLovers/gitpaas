import { DbServiceEntity } from '../db-service.entity';
import { toService, toServicePersistenceError } from '../db-services.transformer';

import { ProjectNotFoundError } from '@features/projects/domain/errors/project.errors';

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

describe('toServicePersistenceError', () => {
    const projectId = 'b2a2132b-d6b7-464a-8aaf-c659a3ca0d60';

    /** Builds the `QueryFailedError` shape TypeORM raises for a driver failure. */
    const queryFailure = (code: string): Error =>
        Object.assign(new Error('insert or update on table "services" violates foreign key constraint'), {
            code,
            driverError: { code },
        });

    it('maps a foreign-key violation into a ProjectNotFoundError', () => {
        expect(toServicePersistenceError(queryFailure('23503'), projectId)).toBeInstanceOf(ProjectNotFoundError);
    });

    it('names the project the caller asked for in the domain error', () => {
        const error = toServicePersistenceError(queryFailure('23503'), projectId);

        expect((error as ProjectNotFoundError).message).toBe(`Project ${projectId} not found`);
    });

    it('never carries the driver message', () => {
        const error = toServicePersistenceError(queryFailure('23503'), projectId);

        expect((error as ProjectNotFoundError).message).not.toContain('foreign key constraint');
    });

    it('chains the driver failure as the cause, for the logs only', () => {
        const original = queryFailure('23503');

        expect((toServicePersistenceError(original, projectId) as ProjectNotFoundError).cause).toBe(original);
    });

    it('reads the code from the wrapped driver error alone', () => {
        const original = Object.assign(new Error('violates foreign key constraint'), {
            driverError: { code: '23503' },
        });

        expect(toServicePersistenceError(original, projectId)).toBeInstanceOf(ProjectNotFoundError);
    });

    it('returns any other driver failure unchanged, so it still surfaces as a 500', () => {
        const original = queryFailure('23505');

        expect(toServicePersistenceError(original, projectId)).toBe(original);
    });

    it('returns an error carrying no SQLSTATE unchanged', () => {
        const original = new Error('connection terminated');

        expect(toServicePersistenceError(original, projectId)).toBe(original);
    });

    it('returns a non-Error thrown value unchanged', () => {
        expect(toServicePersistenceError('boom', projectId)).toBe('boom');
    });
});
