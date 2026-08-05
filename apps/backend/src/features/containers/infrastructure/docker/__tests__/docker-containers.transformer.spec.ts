import { toContainer } from '../docker-containers.transformer';

import type { RuntimeContainerSummary } from '@core/domain/models/container-runtime.models';

/**
 * Builds a runtime container summary fixture, overriding only fields under test.
 */
function containerSummary(overrides: Partial<RuntimeContainerSummary> = {}): RuntimeContainerSummary {
    return {
        id: 'c0ffee0011223344556677889900aabbccddeeff',
        names: ['/gitpaas-api'],
        image: 'gitpaas/api:latest',
        state: 'running',
        status: 'Up 2 hours',
        createdAt: new Date(1_700_000_000 * 1000),
        projects: ['gitpaas-api'],
        ports: [{ privatePort: 3000, publicPort: 8080, type: 'tcp' }],
        ...overrides,
    };
}

describe('toContainer', () => {
    it('maps a full container summary, stripping the leading slash from the name and mapping ports', () => {
        expect(toContainer(containerSummary())).toEqual({
            id: 'c0ffee0011223344556677889900aabbccddeeff',
            name: 'gitpaas-api',
            image: 'gitpaas/api:latest',
            state: 'running',
            status: 'Up 2 hours',
            createdAt: new Date(1_700_000_000 * 1000),
            ports: [{ privatePort: 3000, publicPort: 8080, type: 'tcp' }],
        });
    });

    it('falls back to the first 12 chars of the id when the summary has no names', () => {
        const result = toContainer(containerSummary({ names: [] }));

        expect(result.name).toBe('c0ffee001122');
    });

    it('keeps a missing public port as null', () => {
        const result = toContainer(
            containerSummary({ ports: [{ privatePort: 5432, publicPort: null, type: 'tcp' }] }),
        );

        expect(result.ports).toEqual([{ privatePort: 5432, publicPort: null, type: 'tcp' }]);
    });

    it('returns an empty ports array when the summary has no ports', () => {
        expect(toContainer(containerSummary({ ports: [] })).ports).toEqual([]);
    });

    it('maps multiple ports element-by-element', () => {
        const result = toContainer(
            containerSummary({
                ports: [
                    { privatePort: 80, publicPort: 8080, type: 'tcp' },
                    { privatePort: 443, publicPort: null, type: 'tcp' },
                ],
            }),
        );

        expect(result.ports).toEqual([
            { privatePort: 80, publicPort: 8080, type: 'tcp' },
            { privatePort: 443, publicPort: null, type: 'tcp' },
        ]);
    });

    it('never leaks the runtime summary\'s own port objects into the domain model', () => {
        const summary = containerSummary();

        const result = toContainer(summary);

        expect(result.ports[0]).not.toBe(summary.ports[0]);
    });
});
