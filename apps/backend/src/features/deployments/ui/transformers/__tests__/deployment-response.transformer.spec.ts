import { Deployment } from '../../../domain/models/deployment.models';
import { toDeploymentResponse } from '../deployment-response.transformer';

/** Builds a domain deployment fixture, overriding only the fields under test. */
const deployment = (overrides: Partial<Deployment> = {}): Deployment => ({
    id: 'c1a2b3c4-d5e6-47f8-9a0b-1c2d3e4f5a6b',
    serviceId: '3f2504e0-4f89-41d3-9a0c-0305e82c3301',
    status: 'success',
    branch: 'main',
    commit: 'abc123',
    commitMessage: 'feat: something',
    composerPath: 'docker-compose.yml',
    triggeredBy: 'marc',
    error: null,
    createdAt: new Date('2026-07-11T00:00:00.000Z'),
    finishedAt: new Date('2026-07-11T00:01:00.000Z'),
    ...overrides,
});

describe('toDeploymentResponse', () => {
    it('maps every field of the deployment into the shape of the answer', () => {
        expect(toDeploymentResponse(deployment())).toEqual({
            id: 'c1a2b3c4-d5e6-47f8-9a0b-1c2d3e4f5a6b',
            serviceId: '3f2504e0-4f89-41d3-9a0c-0305e82c3301',
            status: 'success',
            branch: 'main',
            commit: 'abc123',
            commitMessage: 'feat: something',
            composerPath: 'docker-compose.yml',
            triggeredBy: 'marc',
            error: null,
            createdAt: '2026-07-11T00:00:00.000Z',
            finishedAt: '2026-07-11T00:01:00.000Z',
        });
    });

    it('converts each timestamp into a text of the ISO form', () => {
        const response = toDeploymentResponse(deployment());

        expect(typeof response.createdAt).toBe('string');
        expect(typeof response.finishedAt).toBe('string');
    });

    it('never lets a date reach the answer', () => {
        const response = toDeploymentResponse(deployment());

        expect(Object.values(response).some((value) => value instanceof Date)).toBe(false);
    });

    it('keeps a finish that has not happened as null', () => {
        expect(toDeploymentResponse(deployment({ finishedAt: null })).finishedAt).toBeNull();
    });

    it('preserves the nullable commit, commit message and error', () => {
        const response = toDeploymentResponse(deployment({ commit: null, commitMessage: null, error: 'crashed' }));

        expect(response).toMatchObject({ commit: null, commitMessage: null, error: 'crashed' });
    });
});
