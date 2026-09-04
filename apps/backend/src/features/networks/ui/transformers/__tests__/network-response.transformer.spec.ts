import { NetworkStatus } from '../../../domain/models/network.models';
import { toNetworkResponse } from '../network-response.transformer';

/** Builds a domain network fixture, overriding only the fields under test. */
const network = (overrides: Partial<NetworkStatus> = {}): NetworkStatus => ({
    id: 'net-a1b2c3d4',
    name: 'web-frontend_default',
    driver: 'bridge',
    scope: 'local',
    internal: false,
    attachable: true,
    createdAt: new Date('2026-07-11T00:00:00.000Z'),
    state: 'attached',
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
            state: 'attached',
        });
    });

    it('converts the timestamp into a text of the ISO form', () => {
        expect(typeof toNetworkResponse(network()).createdAt).toBe('string');
    });

    it('never lets a date reach the answer', () => {
        const values: unknown[] = Object.values(toNetworkResponse(network()));

        expect(values.some((value) => value instanceof Date)).toBe(false);
    });

    it('carries the state of a network the stack declares and no container holds', () => {
        expect(toNetworkResponse(network({ state: 'declared' })).state).toBe('declared');
    });

    it('carries the state of a network a container holds and the stack does not declare', () => {
        expect(toNetworkResponse(network({ state: 'connected' })).state).toBe('connected');
    });

    it('carries the state of a network the service joined and no container holds yet', () => {
        expect(toNetworkResponse(network({ state: 'joining' })).state).toBe('joining');
    });

    it('carries the state of a network a container still holds after the service left it', () => {
        expect(toNetworkResponse(network({ state: 'leaving' })).state).toBe('leaving');
    });

    it('leaves the timestamp undefined when the network carries none', () => {
        const joining: NetworkStatus = { id: 'net-b2c3', name: 'cache', state: 'joining' };

        expect(toNetworkResponse(joining).createdAt).toBeUndefined();
    });

    it('maps a network that carries the identifier, the name and the state alone', () => {
        const joining: NetworkStatus = { id: 'net-b2c3', name: 'cache', state: 'joining' };

        expect(toNetworkResponse(joining)).toEqual({
            id: 'net-b2c3',
            name: 'cache',
            driver: undefined,
            scope: undefined,
            internal: undefined,
            attachable: undefined,
            createdAt: undefined,
            state: 'joining',
        });
    });

    it('preserves the flags of an internal network that no container may attach to', () => {
        const response = toNetworkResponse(network({ internal: true, attachable: false }));

        expect(response).toMatchObject({ internal: true, attachable: false });
    });
});
