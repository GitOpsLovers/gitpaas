import { Namespace } from '../../../domain/models/namespace.models';
import { toNamespaceResponse } from '../namespace-response.transformer';

/** Builds a domain namespace fixture, overriding only the fields under test. */
const namespace = (overrides: Partial<Namespace> = {}): Namespace => ({
    id: '9c858901-8a57-4791-81fe-4c455b099bc9',
    name: 'platform',
    description: 'The control plane',
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    projectsCount: 3,
    ...overrides,
});

describe('toNamespaceResponse', () => {
    it('maps every field of the namespace into the shape of the answer', () => {
        expect(toNamespaceResponse(namespace())).toEqual({
            id: '9c858901-8a57-4791-81fe-4c455b099bc9',
            name: 'platform',
            description: 'The control plane',
            createdAt: '2026-01-01T00:00:00.000Z',
            projectsCount: 3,
        });
    });

    it('converts the date of creation into a text of the ISO form', () => {
        const response = toNamespaceResponse(namespace({ createdAt: new Date('2026-06-15T09:30:00.000Z') }));

        expect(response.createdAt).toBe('2026-06-15T09:30:00.000Z');
    });

    it('never lets a date reach the answer', () => {
        const response = toNamespaceResponse(namespace());

        expect(Object.values(response as object).some((value) => value instanceof Date)).toBe(false);
    });

    it('carries the empty description of a namespace that holds none', () => {
        expect(toNamespaceResponse(namespace({ description: '' })).description).toBe('');
    });

    it('answers no count when the namespace carries none', () => {
        expect(toNamespaceResponse(namespace({ projectsCount: undefined })).projectsCount).toBeUndefined();
    });

    it('never carries a field the domain object holds beside the declared ones', () => {
        const response = toNamespaceResponse({ ...namespace(), projects: [] } as Namespace);

        expect(response).not.toHaveProperty('projects');
    });
});
