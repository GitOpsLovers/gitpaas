import { DbProjectNetworkEntity } from '../db-project-network.entity';
import { toProjectNetwork } from '../db-project-networks.transformer';

/** Builds a project network database-entity fixture, overriding only the fields under test. */
const projectNetworkEntity = (overrides: Partial<DbProjectNetworkEntity> = {}): DbProjectNetworkEntity => ({
    id: '9f2a1c3e-4b5d-4e6f-8a7b-1c2d3e4f5a6b',
    projectId: 'c1d2e3f4-a5b6-4c7d-8e9f-0a1b2c3d4e5f',
    name: 'private',
    daemonName: 'gitpaas-c1d2e3f4-a5b6-4c7d-8e9f-0a1b2c3d4e5f-9f2a1c3e-4b5d-4e6f-8a7b-1c2d3e4f5a6b',
    ...overrides,
});

describe('toProjectNetwork', () => {
    it('maps every field of the entity into the domain model', () => {
        expect(toProjectNetwork(projectNetworkEntity())).toEqual({
            id: '9f2a1c3e-4b5d-4e6f-8a7b-1c2d3e4f5a6b',
            projectId: 'c1d2e3f4-a5b6-4c7d-8e9f-0a1b2c3d4e5f',
            name: 'private',
            daemonName: 'gitpaas-c1d2e3f4-a5b6-4c7d-8e9f-0a1b2c3d4e5f-9f2a1c3e-4b5d-4e6f-8a7b-1c2d3e4f5a6b',
        });
    });

    it('keeps the display name apart from the name of the daemon', () => {
        const result = toProjectNetwork(projectNetworkEntity({ name: 'back office', daemonName: 'gitpaas-a-b' }));

        expect(result).toMatchObject({ name: 'back office', daemonName: 'gitpaas-a-b' });
    });

    it('never carries the relation of the project into the domain model', () => {
        const result = toProjectNetwork(
            projectNetworkEntity({ project: { id: 'x' } as DbProjectNetworkEntity['project'] }),
        );

        expect(result).not.toHaveProperty('project');
    });

    it('never carries a state, because the daemon gives it at the read', () => {
        expect(toProjectNetwork(projectNetworkEntity())).not.toHaveProperty('state');
    });
});
