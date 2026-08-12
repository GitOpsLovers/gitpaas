import { ProjectNotFoundError } from '../project.errors';

import { DomainError } from '@core/domain/errors/domain.error';

const projectId = 'b2a2132b-d6b7-464a-8aaf-c659a3ca0d60';

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
