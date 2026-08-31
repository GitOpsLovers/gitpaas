import { Service } from '../../../domain/models/service.models';
import { toServiceResponse } from '../service-response.transformer';

/** Builds a domain service fixture, overriding only the fields under test. */
const service = (overrides: Partial<Service> = {}): Service => ({
    id: 'f4f8c2a0-6d3b-4d0a-9b6e-2c1d5e8a7b90',
    name: 'api-gateway',
    description: 'The gateway of the API',
    projectId: 'b2a2132b-d6b7-464a-8aaf-c659a3ca0d60',
    providerId: 'c3d4e5f6-a7b8-4c9d-8e1f-2a3b4c5d6e7f',
    repositoryId: '42',
    deploymentBranch: 'main',
    composerPath: 'docker-compose.yml',
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    ...overrides,
});

describe('toServiceResponse', () => {
    it('maps every field of the service into the shape of the answer', () => {
        expect(toServiceResponse(service())).toEqual({
            id: 'f4f8c2a0-6d3b-4d0a-9b6e-2c1d5e8a7b90',
            name: 'api-gateway',
            description: 'The gateway of the API',
            projectId: 'b2a2132b-d6b7-464a-8aaf-c659a3ca0d60',
            providerId: 'c3d4e5f6-a7b8-4c9d-8e1f-2a3b4c5d6e7f',
            repositoryId: '42',
            deploymentBranch: 'main',
            composerPath: 'docker-compose.yml',
            createdAt: '2026-01-01T00:00:00.000Z',
        });
    });

    it('converts the date of creation into a text of the ISO form', () => {
        const response = toServiceResponse(service({ createdAt: new Date('2026-06-15T09:30:00.000Z') }));

        expect(response.createdAt).toBe('2026-06-15T09:30:00.000Z');
    });

    it('never lets a date reach the answer', () => {
        const response = toServiceResponse(service());

        expect(Object.values(response as object).some((value) => value instanceof Date)).toBe(false);
    });

    it('carries the empty description of a service that holds none', () => {
        expect(toServiceResponse(service({ description: '' })).description).toBe('');
    });

    it('carries a null provider when the service names none', () => {
        expect(toServiceResponse(service({ providerId: null })).providerId).toBeNull();
    });
});
