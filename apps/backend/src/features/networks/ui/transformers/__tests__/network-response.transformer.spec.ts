import { Network } from '../../../domain/models/network.models';
import { toNetworkResponse } from '../network-response.transformer';

/** Builds a domain network fixture, overriding only the fields under test. */
const network = (overrides: Partial<Network> = {}): Network => ({
    id: 'net-a1b2c3d4',
    name: 'web-frontend_default',
    driver: 'bridge',
    scope: 'local',
    internal: false,
    attachable: true,
    createdAt: new Date('2026-07-11T00:00:00.000Z'),
    ...overrides,
});

describe('toNetworkResponse', () => {
    it('maps every field of the network into the shape of the answer', () => {
        expect(toNetworkResponse(network())).toEqual({
            id: 'net-a1b2c3d4',
            name: 'web-frontend_default',
            driver: 'bridge',
            scope: 'local',
            internal: false,
            attachable: true,
            createdAt: '2026-07-11T00:00:00.000Z',
        });
    });

    it('converts the timestamp into a text of the ISO form', () => {
        expect(typeof toNetworkResponse(network()).createdAt).toBe('string');
    });

    it('never lets a date reach the answer', () => {
        const response = toNetworkResponse(network());

        expect(Object.values(response).some((value) => value instanceof Date)).toBe(false);
    });

    it('preserves the flags of an internal network that no container may attach to', () => {
        const response = toNetworkResponse(network({ internal: true, attachable: false }));

        expect(response).toMatchObject({ internal: true, attachable: false });
    });
});
