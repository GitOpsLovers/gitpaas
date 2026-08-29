import { ProjectNetworkStatus } from '../../../domain/models/project-network.models';
import { toProjectNetworkResponse } from '../project-network-response.transformer';

const projectId = 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d';
const networkId = 'b2c3d4e5-f6a7-4b8c-9d0e-1f2a3b4c5d6e';

describe('toProjectNetworkResponse', () => {
    it('maps every field of the network of a project into the answer', () => {
        const network: ProjectNetworkStatus = {
            id: networkId,
            projectId,
            name: 'private',
            daemonName: `gitpaas-${projectId}-${networkId}`,
            state: 'ready',
        };

        expect(toProjectNetworkResponse(network)).toEqual({
            id: networkId,
            projectId,
            name: 'private',
            daemonName: `gitpaas-${projectId}-${networkId}`,
            state: 'ready',
        });
    });

    it.each(['ready', 'missing', 'orphan'] as const)('carries the state %s of the network', (state) => {
        const network: ProjectNetworkStatus = {
            id: networkId,
            projectId,
            name: 'private',
            daemonName: `gitpaas-${projectId}-${networkId}`,
            state,
        };

        expect(toProjectNetworkResponse(network).state).toBe(state);
    });
});
