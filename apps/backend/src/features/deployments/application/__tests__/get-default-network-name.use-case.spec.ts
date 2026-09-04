import { COMPOSE_DEFAULT_NETWORK_KEY, getDefaultNetworkKeyUseCase, getDefaultNetworkNameUseCase } from '../get-default-network-name.use-case';

const serviceId = '3f2504e0-4f89-41d3-9a0c-0305e82c3301';

describe('getDefaultNetworkKeyUseCase', () => {
    it('builds the key from the identifier of the service and the key of Compose', () => {
        expect(getDefaultNetworkKeyUseCase(serviceId)).toBe(`${serviceId}_${COMPOSE_DEFAULT_NETWORK_KEY}`);
    });

    it('never gives back the bare key of Compose, which every service of one project would share', () => {
        expect(getDefaultNetworkKeyUseCase(serviceId)).not.toBe(COMPOSE_DEFAULT_NETWORK_KEY);
    });
});

describe('getDefaultNetworkNameUseCase', () => {
    it('prefixes the key with the name of the Compose project, as Compose does', () => {
        expect(getDefaultNetworkNameUseCase('acme_shop', serviceId)).toBe(`acme_shop_${serviceId}_default`);
    });

    it('gives two services of one project two distinct names on the daemon', () => {
        const sibling = 'c9d0e1f2-a3b4-4c5d-8e9f-0a1b2c3d4e5f';

        expect(getDefaultNetworkNameUseCase('acme_shop', serviceId)).not.toBe(getDefaultNetworkNameUseCase('acme_shop', sibling));
    });

    it('builds a name the daemon accepts for a network', () => {
        expect(getDefaultNetworkNameUseCase('acme_shop', serviceId)).toMatch(/^[\dA-Za-z][\w.-]*$/);
    });
});
