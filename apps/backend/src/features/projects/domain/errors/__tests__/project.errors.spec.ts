import { ProjectNameTakenError, ProjectNotFoundError } from '../project.errors';

import { DomainError } from '@core/domain/errors/domain.error';

const projectId = 'b2a2132b-d6b7-464a-8aaf-c659a3ca0d60';
const namespaceId = '3f2504e0-4f89-41d3-9a0c-0305e82c3301';

describe('ProjectNotFoundError', () => {
    it('is an Error', () => {
        expect(new ProjectNotFoundError(projectId)).toBeInstanceOf(Error);
    });

    it('is a DomainError', () => {
        expect(new ProjectNotFoundError(projectId)).toBeInstanceOf(DomainError);
    });

    it('sets its name to ProjectNotFoundError', () => {
        expect(new ProjectNotFoundError(projectId).name).toBe('ProjectNotFoundError');
    });

    it('carries the PROJECT_NOT_FOUND code', () => {
        expect(new ProjectNotFoundError(projectId).code).toBe('PROJECT_NOT_FOUND');
    });

    it('builds a message carrying the project identifier', () => {
        expect(new ProjectNotFoundError(projectId).message).toBe(`Project ${projectId} not found`);
    });

    it('carries the identifier it received, and not a fixed one', () => {
        expect(new ProjectNotFoundError('another-id').message).toBe('Project another-id not found');
    });

    it('chains the original error through the cause option', () => {
        const original = new Error('foreign key violation');

        expect(new ProjectNotFoundError(projectId, { cause: original }).cause).toBe(original);
    });
});

describe('ProjectNameTakenError', () => {
    it('is an Error', () => {
        expect(new ProjectNameTakenError(namespaceId, 'platform')).toBeInstanceOf(Error);
    });

    it('is a DomainError', () => {
        expect(new ProjectNameTakenError(namespaceId, 'platform')).toBeInstanceOf(DomainError);
    });

    it('sets its name to ProjectNameTakenError', () => {
        expect(new ProjectNameTakenError(namespaceId, 'platform').name).toBe('ProjectNameTakenError');
    });

    it('carries the PROJECT_NAME_TAKEN code', () => {
        expect(new ProjectNameTakenError(namespaceId, 'platform').code).toBe('PROJECT_NAME_TAKEN');
    });

    it('builds a message carrying the name and the namespace it clashes in', () => {
        expect(new ProjectNameTakenError(namespaceId, 'platform').message).toBe(
            `Project platform already exists in namespace ${namespaceId}`,
        );
    });

    it('carries the values it received, and not fixed ones', () => {
        expect(new ProjectNameTakenError('another-namespace', 'another-name').message).toBe(
            'Project another-name already exists in namespace another-namespace',
        );
    });

    it('chains the driver failure through the cause option', () => {
        const original = new Error('duplicate key value violates unique constraint');

        expect(new ProjectNameTakenError(namespaceId, 'platform', { cause: original }).cause).toBe(original);
    });
});
