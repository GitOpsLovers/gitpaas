import { ProjectNameTakenError } from '../../../domain/errors/project.errors';
import { DbProjectEntity } from '../db-project.entity';
import { toProject, toProjectPersistenceError } from '../db-projects.transformer';

import { DbServiceEntity } from '@features/services/infrastructure/database/db-service.entity';

const namespaceId = '3f2504e0-4f89-41d3-9a0c-0305e82c3301';
const createdAt = new Date('2026-01-01T00:00:00.000Z');

describe('toProject', () => {
    it('maps the entity fields and derives servicesCount from the loaded relation', () => {
        const entity: DbProjectEntity = {
            id: 'p-1',
            name: 'GitPaaS',
            description: 'The control plane',
            namespaceId,
            createdAt,
            services: [{} as DbServiceEntity, {} as DbServiceEntity, {} as DbServiceEntity],
        };

        expect(toProject(entity)).toEqual({
            id: 'p-1',
            name: 'GitPaaS',
            description: 'The control plane',
            namespaceId,
            createdAt,
            servicesCount: 3,
        });
    });

    it('defaults servicesCount to 0 when the services relation is undefined (not loaded)', () => {
        const entity: DbProjectEntity = {
            id: 'p-2', name: 'No relation', description: '', namespaceId, createdAt,
        };

        expect(toProject(entity)).toEqual({
            id: 'p-2',
            name: 'No relation',
            description: '',
            namespaceId,
            createdAt,
            servicesCount: 0,
        });
    });

    it('derives servicesCount of 0 for an empty loaded relation', () => {
        const entity: DbProjectEntity = {
            id: 'p-3', name: 'Empty', description: '', namespaceId, createdAt, services: [],
        };

        expect(toProject(entity)).toEqual({
            id: 'p-3',
            name: 'Empty',
            description: '',
            namespaceId,
            createdAt,
            servicesCount: 0,
        });
    });

    it('carries the empty description of a project that holds none', () => {
        const entity: DbProjectEntity = {
            id: 'p-5', name: 'Bare', description: '', namespaceId, createdAt, services: [],
        };

        expect(toProject(entity).description).toBe('');
    });

    it('carries the date of creation as a Date, and never as a text', () => {
        const entity: DbProjectEntity = {
            id: 'p-6', name: 'Dated', description: '', namespaceId, createdAt, services: [],
        };

        expect(toProject(entity).createdAt).toBe(createdAt);
    });

    it('never copies the loaded namespace relation into the domain model', () => {
        const entity: DbProjectEntity = {
            id: 'p-4',
            name: 'GitPaaS',
            description: '',
            namespaceId,
            createdAt,
            namespace: {
                id: namespaceId, name: 'platform', description: '', createdAt,
            },
            services: [],
        };

        expect(toProject(entity)).not.toHaveProperty('namespace');
    });
});

describe('toProjectPersistenceError', () => {
    /** Failures the transformer must classify as a duplicate project name. */
    const uniqueViolations: Array<[string, unknown]> = [
        ['a driver failure carrying the SQLSTATE at its top level', { code: '23505' }],
        ['a TypeORM QueryFailedError wrapping the driver failure', { driverError: { code: '23505' } }],
        [
            'a wrapper whose driverError SQLSTATE wins over its own code',
            { code: '23503', driverError: { code: '23505' } },
        ],
    ];

    /** Failures the transformer must leave untouched. */
    const passThroughFailures: Array<[string, unknown]> = [
        ['a foreign-key violation', { code: '23503' }],
        ['a wrapper carrying a non-unique driver SQLSTATE', { driverError: { code: '23502' } }],
        ['an error with no code at all', new Error('connection terminated')],
        ['a numeric code, since only a string SQLSTATE is read', { code: 23505 }],
        ['a null throw', null],
        ['an undefined throw', undefined],
        ['a thrown string', 'boom'],
    ];

    it.each(uniqueViolations)('turns %s into a ProjectNameTakenError', (_case, error) => {
        expect(toProjectPersistenceError(error, namespaceId, 'gitpaas')).toBeInstanceOf(ProjectNameTakenError);
    });

    it.each(passThroughFailures)('returns %s untouched', (_case, error) => {
        expect(toProjectPersistenceError(error, namespaceId, 'gitpaas')).toBe(error);
    });

    it('names the namespace and the project in the duplicate-name message', () => {
        const result = toProjectPersistenceError({ code: '23505' }, namespaceId, 'gitpaas') as ProjectNameTakenError;

        expect(result.message).toBe(`Project gitpaas already exists in namespace ${namespaceId}`);
    });

    it('carries the PROJECT_NAME_TAKEN code', () => {
        const result = toProjectPersistenceError({ code: '23505' }, namespaceId, 'gitpaas') as ProjectNameTakenError;

        expect(result.code).toBe('PROJECT_NAME_TAKEN');
    });

    it('chains the driver failure as the cause of the domain error', () => {
        const driverFailure = { code: '23505' };

        const result = toProjectPersistenceError(driverFailure, namespaceId, 'gitpaas') as ProjectNameTakenError;

        expect(result.cause).toBe(driverFailure);
    });
});
