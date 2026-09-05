/* eslint-disable no-secrets/no-secrets */
import { COMPOSE_DEFAULT_NETWORK_KEY, getDefaultNetworkKeyUseCase, getDefaultNetworkNameUseCase } from '../get-default-network-name.use-case';

describe('getDefaultNetworkKeyUseCase', () => {
    it('builds the key from the prefix of the network and the key of Compose', () => {
        expect(getDefaultNetworkKeyUseCase()).toBe(`network_${COMPOSE_DEFAULT_NETWORK_KEY}`);
    });

    it('never gives back the bare key of Compose, which `dockerode-compose` leaves with no label', () => {
        expect(getDefaultNetworkKeyUseCase()).not.toBe(COMPOSE_DEFAULT_NETWORK_KEY);
    });
});

describe('getDefaultNetworkNameUseCase', () => {
    it('prefixes the key with the name of the Compose project, as Compose does', () => {
        expect(getDefaultNetworkNameUseCase('acme_shop')).toBe('acme_shop_network_default');
    });

    it('gives every service of one project the same name on the daemon', () => {
        expect(getDefaultNetworkNameUseCase('acme_shop')).toBe(getDefaultNetworkNameUseCase('acme_shop'));
    });

    it('gives two projects two distinct names on the daemon', () => {
        expect(getDefaultNetworkNameUseCase('acme_shop')).not.toBe(getDefaultNetworkNameUseCase('acme_blog'));
    });

    it('builds a name the daemon accepts for a network', () => {
        expect(getDefaultNetworkNameUseCase('acme_shop')).toMatch(/^[\dA-Za-z][\w.-]*$/);
    });
});
