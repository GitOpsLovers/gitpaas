import { Container } from '../../../domain/models/container.models';
import { toContainerResponse } from '../container-response.transformer';

/** Builds a domain container fixture, overriding only the fields under test. */
const container = (overrides: Partial<Container> = {}): Container => ({
    id: 'abc123',
    name: 'web',
    image: 'nginx:latest',
    state: 'running',
    status: 'Up 2 hours',
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    ports: [{ privatePort: 80, publicPort: 8080, type: 'tcp' }],
    ...overrides,
});

describe('toContainerResponse', () => {
    it('maps every field of the container into the shape of the answer', () => {
        expect(toContainerResponse(container())).toEqual({
            id: 'abc123',
            name: 'web',
            image: 'nginx:latest',
            state: 'running',
            status: 'Up 2 hours',
            createdAt: '2026-01-01T00:00:00.000Z',
            ports: [{ privatePort: 80, publicPort: 8080, type: 'tcp' }],
        });
    });

    it('converts the timestamp into a text of the ISO form', () => {
        expect(typeof toContainerResponse(container()).createdAt).toBe('string');
    });

    it('never lets a date reach the answer', () => {
        const response = toContainerResponse(container());

        expect(Object.values(response).some((value) => value instanceof Date)).toBe(false);
    });

    it('keeps a port that the host does not publish as null', () => {
        const response = toContainerResponse(container({
            ports: [{ privatePort: 5432, publicPort: null, type: 'tcp' }],
        }));

        expect(response.ports).toEqual([{ privatePort: 5432, publicPort: null, type: 'tcp' }]);
    });

    it('keeps an empty list of ports empty', () => {
        expect(toContainerResponse(container({ ports: [] })).ports).toEqual([]);
    });
});
