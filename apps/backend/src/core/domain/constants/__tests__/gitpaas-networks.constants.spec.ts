import { GITPAAS_DATA_NETWORK, GITPAAS_OWNED_NETWORKS, GITPAAS_PROXY_NETWORK } from '../gitpaas-networks.constants';

describe('gitpaas-networks.constants', () => {
    describe('GITPAAS_OWNED_NETWORKS', () => {
        it('holds the network of the proxy and the network of the two databases', () => {
            expect(GITPAAS_OWNED_NETWORKS).toContain(GITPAAS_PROXY_NETWORK);
            expect(GITPAAS_OWNED_NETWORKS).toContain(GITPAAS_DATA_NETWORK);
        });

        it('holds the default network of the production and of the development control plane', () => {
            expect(GITPAAS_OWNED_NETWORKS).toContain('gitpaas_default');
            expect(GITPAAS_OWNED_NETWORKS).toContain('gitpaas-dev_default');
        });

        it('holds no other network, so the stack of a user reaches every network of its own', () => {
            expect(GITPAAS_OWNED_NETWORKS).toEqual([
                'gitpaas-proxy',
                'gitpaas-data',
                'gitpaas_default',
                'gitpaas-dev_default',
            ]);
        });
    });
});
