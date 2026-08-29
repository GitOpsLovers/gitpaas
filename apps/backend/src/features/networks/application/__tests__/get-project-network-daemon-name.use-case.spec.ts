/* eslint-disable no-secrets/no-secrets */
import {
    getProjectNetworkDaemonNameUseCase,
    getProjectNetworkDaemonPrefixUseCase,
} from '../get-project-network-daemon-name.use-case';

const projectId = 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d';
const networkId = 'b2c3d4e5-f6a7-4b8c-9d0e-1f2a3b4c5d6e';

describe('getProjectNetworkDaemonPrefixUseCase', () => {
    it('builds the prefix from the platform name and the project id', () => {
        expect(getProjectNetworkDaemonPrefixUseCase(projectId)).toBe(`gitpaas-${projectId}-`);
    });
});

describe('getProjectNetworkDaemonNameUseCase', () => {
    it('joins the prefix of the project and the id of the network', () => {
        expect(getProjectNetworkDaemonNameUseCase(projectId, networkId)).toBe(`gitpaas-${projectId}-${networkId}`);
    });

    it('starts with the prefix of its project', () => {
        const name = getProjectNetworkDaemonNameUseCase(projectId, networkId);

        expect(name.startsWith(getProjectNetworkDaemonPrefixUseCase(projectId))).toBe(true);
    });
});
