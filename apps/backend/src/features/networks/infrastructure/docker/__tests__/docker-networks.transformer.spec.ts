import Docker from 'dockerode';

import { toNetwork } from '../docker-networks.transformer';

describe('toNetwork', () => {
    it('maps every network field and converts the ISO created timestamp to a Date', () => {
        const info = {
            Id: 'n-1',
            Name: 'artifactory_default',
            Driver: 'bridge',
            Scope: 'local',
            Internal: false,
            Attachable: true,
            Created: '2026-07-11T00:00:00.000Z',
        } as Docker.NetworkInspectInfo;

        expect(toNetwork(info)).toEqual({
            id: 'n-1',
            name: 'artifactory_default',
            driver: 'bridge',
            scope: 'local',
            internal: false,
            attachable: true,
            createdAt: new Date('2026-07-11T00:00:00.000Z'),
        });
    });

    it('preserves the boolean flags for an internal, non-attachable network', () => {
        const info = {
            Id: 'n-2',
            Name: 'internal-net',
            Driver: 'overlay',
            Scope: 'swarm',
            Internal: true,
            Attachable: false,
            Created: '2026-01-01T12:30:00.000Z',
        } as Docker.NetworkInspectInfo;

        const result = toNetwork(info);

        expect(result.internal).toBe(true);
        expect(result.attachable).toBe(false);
        expect(result.driver).toBe('overlay');
        expect(result.scope).toBe('swarm');
        expect(result.createdAt).toEqual(new Date('2026-01-01T12:30:00.000Z'));
    });
});
