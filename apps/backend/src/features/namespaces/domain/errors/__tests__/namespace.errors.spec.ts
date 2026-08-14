import { NamespaceNotEmptyError, NamespaceNotFoundError } from '../namespace.errors';

import { DomainError } from '@core/domain/errors/domain.error';

const namespaceId = 'b2a2132b-d6b7-464a-8aaf-c659a3ca0d60';

describe('NamespaceNotFoundError', () => {
    it('is an Error', () => {
        expect(new NamespaceNotFoundError(namespaceId)).toBeInstanceOf(Error);
    });

    it('is a DomainError', () => {
        expect(new NamespaceNotFoundError(namespaceId)).toBeInstanceOf(DomainError);
    });

    it('sets its name to NamespaceNotFoundError', () => {
        expect(new NamespaceNotFoundError(namespaceId).name).toBe('NamespaceNotFoundError');
    });

    it('carries the NAMESPACE_NOT_FOUND code', () => {
        expect(new NamespaceNotFoundError(namespaceId).code).toBe('NAMESPACE_NOT_FOUND');
    });

    it('builds a message carrying the namespace identifier', () => {
        expect(new NamespaceNotFoundError(namespaceId).message).toBe(`Namespace ${namespaceId} not found`);
    });

    it('carries the identifier it received, and not a fixed one', () => {
        expect(new NamespaceNotFoundError('another-id').message).toBe('Namespace another-id not found');
    });

    it('chains the original error through the cause option', () => {
        const original = new Error('row is gone');

        expect(new NamespaceNotFoundError(namespaceId, { cause: original }).cause).toBe(original);
    });
});

describe('NamespaceNotEmptyError', () => {
    it('is an Error', () => {
        expect(new NamespaceNotEmptyError(namespaceId, 2)).toBeInstanceOf(Error);
    });

    it('is a DomainError', () => {
        expect(new NamespaceNotEmptyError(namespaceId, 2)).toBeInstanceOf(DomainError);
    });

    it('sets its name to NamespaceNotEmptyError', () => {
        expect(new NamespaceNotEmptyError(namespaceId, 2).name).toBe('NamespaceNotEmptyError');
    });

    it('carries the NAMESPACE_NOT_EMPTY code', () => {
        expect(new NamespaceNotEmptyError(namespaceId, 2).code).toBe('NAMESPACE_NOT_EMPTY');
    });

    it('builds a message carrying the namespace identifier and the blocking projects count', () => {
        expect(new NamespaceNotEmptyError(namespaceId, 2).message).toBe(
            `Namespace ${namespaceId} still has 2 project(s) attached`,
        );
    });

    it('carries the count it received, and not a fixed one', () => {
        expect(new NamespaceNotEmptyError(namespaceId, 7).message).toBe(
            `Namespace ${namespaceId} still has 7 project(s) attached`,
        );
    });

    it('chains the original error through the cause option', () => {
        const original = new Error('foreign key violation');

        expect(new NamespaceNotEmptyError(namespaceId, 1, { cause: original }).cause).toBe(original);
    });
});
