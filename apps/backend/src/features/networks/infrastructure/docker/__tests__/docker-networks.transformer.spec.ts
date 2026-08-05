import { toNetwork } from '../docker-networks.transformer';

import type { RuntimeNetworkSummary } from '@core/domain/models/container-runtime.models';

describe('toNetwork', () => {
    it('maps every network field of a runtime summary', () => {
        const info: RuntimeNetworkSummary = {
            id: 'n-1',
            name: 'gitpaas_default',
            driver: 'bridge',
            scope: 'local',
            internal: false,
            attachable: true,
            createdAt: new Date('2026-07-11T00:00:00.000Z'),
        };

        expect(toNetwork(info)).toEqual({
            id: 'n-1',
            name: 'gitpaas_default',
            driver: 'bridge',
            scope: 'local',
            internal: false,
            attachable: true,
            createdAt: new Date('2026-07-11T00:00:00.000Z'),
        });
    });

    it('preserves the boolean flags for an internal, non-attachable network', () => {
        const info: RuntimeNetworkSummary = {
            id: 'n-2',
            name: 'internal-net',
            driver: 'overlay',
            scope: 'swarm',
            internal: true,
            attachable: false,
            createdAt: new Date('2026-01-01T12:30:00.000Z'),
        };

        const result = toNetwork(info);

        expect(result.internal).toBe(true);
        expect(result.attachable).toBe(false);
        expect(result.driver).toBe('overlay');
        expect(result.scope).toBe('swarm');
        expect(result.createdAt).toEqual(new Date('2026-01-01T12:30:00.000Z'));
    });
});
