import { DeploymentRunBus, DeploymentRunRequest } from '../deployment-run.bus';

const request: DeploymentRunRequest = {
    deploymentId: '9c858901-8a57-4791-81fe-4c455b099bc9',
    repositoryId: 42,
    commit: '2b8c1f0a9e4d7c6b5a4f3e2d1c0b9a8f7e6d5c4b',
    composerPath: 'docker-compose.yml',
    projectName: 'artifactory',
};

describe('DeploymentRunBus', () => {
    let bus: DeploymentRunBus;

    beforeEach(() => {
        bus = new DeploymentRunBus();
    });

    it('emits published requests to subscribers', () => {
        const received: DeploymentRunRequest[] = [];
        bus.requests$.subscribe((value) => received.push(value));

        bus.request(request);

        expect(received).toEqual([request]);
    });

    it('does not replay requests published before subscription', () => {
        bus.request(request);

        const received: DeploymentRunRequest[] = [];
        bus.requests$.subscribe((value) => received.push(value));

        expect(received).toEqual([]);
    });
});
