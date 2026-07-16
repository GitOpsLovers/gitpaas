import { DeploymentRunTask } from '../../../domain/models/deployment-run-task.model';
import { RxjsDeploymentQueue } from '../rxjs-deployment.queue';

const task: DeploymentRunTask = {
    deploymentId: '9c858901-8a57-4791-81fe-4c455b099bc9',
    repositoryId: 42,
    commit: '2b8c1f0a9e4d7c6b5a4f3e2d1c0b9a8f7e6d5c4b',
    composerPath: 'docker-compose.yml',
    projectName: 'artifactory',
};

describe('RxjsDeploymentQueue', () => {
    let bus: RxjsDeploymentQueue;

    beforeEach(() => {
        bus = new RxjsDeploymentQueue();
    });

    it('emits published tasks to subscribers', () => {
        const received: DeploymentRunTask[] = [];
        bus.dequeued$.subscribe((value) => received.push(value));

        bus.enqueue(task);

        expect(received).toEqual([task]);
    });

    it('does not replay tasks published before subscription', () => {
        bus.enqueue(task);

        const received: DeploymentRunTask[] = [];
        bus.dequeued$.subscribe((value) => received.push(value));

        expect(received).toEqual([]);
    });
});
