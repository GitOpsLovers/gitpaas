import { DbServiceEntity } from '../db-service.entity';
import { toService, toServicePersistenceError } from '../db-services.transformer';

import { ProjectNotFoundError } from '@features/projects/domain/errors/project.errors';
import { ProviderNotFoundError } from '@features/providers/domain/errors/provider.errors';

const createdAt = new Date('2026-01-01T00:00:00.000Z');

describe('toService', () => {
    it('maps every service entity field into the domain model', () => {
        const entity: DbServiceEntity = {
            id: 's-1',
            name: 'api',
            description: 'The gateway of the API',
            projectId: 'p-1',
            providerId: 'pv-1',
            repositoryId: 'gitopslovers/api',
            deploymentBranch: 'main',
            composerPath: 'docker-compose.yml',
            createdAt,
        };

        expect(toService(entity)).toEqual({
            id: 's-1',
            name: 'api',
            description: 'The gateway of the API',
            projectId: 'p-1',
            providerId: 'pv-1',
            repositoryId: 'gitopslovers/api',
            deploymentBranch: 'main',
            composerPath: 'docker-compose.yml',
            createdAt,
        });
    });

    it('preserves empty-string defaults for optional persistence columns', () => {
        const entity: DbServiceEntity = {
            id: 's-2',
            name: 'web',
            description: '',
            projectId: 'p-2',
            providerId: 'pv-2',
            repositoryId: '',
            deploymentBranch: '',
            composerPath: '',
            createdAt,
        };

        expect(toService(entity)).toEqual({
            id: 's-2',
            name: 'web',
            description: '',
            projectId: 'p-2',
            providerId: 'pv-2',
            repositoryId: '',
            deploymentBranch: '',
            composerPath: '',
            createdAt,
        });
    });

    it('gives a null provider when the service names none', () => {
        const entity: DbServiceEntity = {
            id: 's-3',
            name: 'worker',
            description: '',
            projectId: 'p-3',
            providerId: null,
            repositoryId: '',
            deploymentBranch: '',
            composerPath: '',
            createdAt,
        };

        expect(toService(entity).providerId).toBeNull();
    });

    it('carries the date of creation as a Date, and never as a text', () => {
        const entity: DbServiceEntity = {
            id: 's-5',
            name: 'worker',
            description: '',
            projectId: 'p-5',
            providerId: null,
            repositoryId: '',
            deploymentBranch: '',
            composerPath: '',
            createdAt,
        };

        expect(toService(entity).createdAt).toBe(createdAt);
    });

    it('gives a null provider when the column carries no value at all', () => {
        const entity = {
            id: 's-4',
            name: 'worker',
            projectId: 'p-4',
            repositoryId: '',
            deploymentBranch: '',
            composerPath: '',
        } as unknown as DbServiceEntity;

        expect(toService(entity).providerId).toBeNull();
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

    it('maps a violation of the provider foreign key into a ProviderNotFoundError', () => {
        const providerId = 'c3d4e5f6-a7b8-4c9d-8e1f-2a3b4c5d6e7f';
        const failure = Object.assign(queryFailure('23503'), { constraint: 'FK_services_providerId' });

        const error = toServicePersistenceError(failure, projectId, providerId);

        expect(error).toBeInstanceOf(ProviderNotFoundError);
        expect((error as ProviderNotFoundError).message).toBe(`Provider ${providerId} not found`);
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
