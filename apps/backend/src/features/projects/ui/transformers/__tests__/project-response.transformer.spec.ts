import { Project } from '../../../domain/models/project.models';
import { toProjectResponse } from '../project-response.transformer';

/** Builds a domain project fixture, overriding only the fields under test. */
const project = (overrides: Partial<Project> = {}): Project => ({
    id: '9c858901-8a57-4791-81fe-4c455b099bc9',
    name: 'gitpaas',
    description: 'The control plane',
    namespaceId: '3f2504e0-4f89-41d3-9a0c-0305e82c3301',
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    servicesCount: 3,
    ...overrides,
});

describe('toProjectResponse', () => {
    it('maps every field of the project into the shape of the answer', () => {
        expect(toProjectResponse(project())).toEqual({
            id: '9c858901-8a57-4791-81fe-4c455b099bc9',
            name: 'gitpaas',
            description: 'The control plane',
            namespaceId: '3f2504e0-4f89-41d3-9a0c-0305e82c3301',
            createdAt: '2026-01-01T00:00:00.000Z',
            servicesCount: 3,
        });
    });

    it('converts the date of creation into a text of the ISO form', () => {
        const response = toProjectResponse(project({ createdAt: new Date('2026-06-15T09:30:00.000Z') }));

        expect(response.createdAt).toBe('2026-06-15T09:30:00.000Z');
    });

    it('never lets a date reach the answer', () => {
        const response = toProjectResponse(project());

        expect(Object.values(response as object).some((value) => value instanceof Date)).toBe(false);
    });

    it('carries the empty description of a project that holds none', () => {
        expect(toProjectResponse(project({ description: '' })).description).toBe('');
    });

    it('answers no service when the project carries no count', () => {
        expect(toProjectResponse(project({ servicesCount: undefined })).servicesCount).toBe(0);
    });

    it('never carries a relation the domain object holds beside the declared fields', () => {
        const response = toProjectResponse({ ...project(), services: [] } as Project);

        expect(response).not.toHaveProperty('services');
    });
});
