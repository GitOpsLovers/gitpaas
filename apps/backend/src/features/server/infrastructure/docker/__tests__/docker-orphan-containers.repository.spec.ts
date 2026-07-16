import { DockerOrphanContainersRepository } from '../docker-orphan-containers.repository';

import { DockerClient } from '@core/infrastructure/docker/docker.client';
import { DiagnosticLoggerService } from '@core/ui/services/diagnostic-logger.service';

const COMPOSE_PROJECT_LABEL = 'com.docker.compose.project';

/**
 * Builds a listed container fixture stamped with a compose project label.
 */
function container(project: string, overrides: { Id?: string; Names?: string[] } = {}) {
    return {
        Id: overrides.Id ?? `id-${project}`,
        Names: overrides.Names ?? [`/${project}-app-1`],
        Labels: { [COMPOSE_PROJECT_LABEL]: project },
    };
}

describe('DockerOrphanContainersRepository', () => {
    let listContainers: jest.Mock;
    let remove: jest.Mock;
    let getContainer: jest.Mock;
    let client: jest.Mocked<DockerClient>;
    let diagnostics: jest.Mocked<DiagnosticLoggerService>;
    let repository: DockerOrphanContainersRepository;

    beforeEach(() => {
        listContainers = jest.fn().mockResolvedValue([]);
        remove = jest.fn().mockResolvedValue(undefined);
        getContainer = jest.fn().mockReturnValue({ remove });
        client = {
            getClient: jest.fn().mockReturnValue({ listContainers, getContainer }),
        } as unknown as jest.Mocked<DockerClient>;
        diagnostics = {
            log: jest.fn(), warn: jest.fn(), error: jest.fn(),
        } as unknown as jest.Mocked<DiagnosticLoggerService>;
        repository = new DockerOrphanContainersRepository(client, diagnostics);
    });

    it('lists only compose-labeled containers, all states included', async () => {
        await repository.removeOrphaned([]);

        expect(listContainers).toHaveBeenCalledTimes(1);
        expect(listContainers).toHaveBeenCalledWith({
            all: true,
            filters: { label: [COMPOSE_PROJECT_LABEL] },
        });
    });

    it('force-removes containers whose project is not known, dropping volumes', async () => {
        listContainers.mockResolvedValue([container('orphan')]);

        const result = await repository.removeOrphaned(['known']);

        expect(getContainer).toHaveBeenCalledWith('id-orphan');
        expect(remove).toHaveBeenCalledWith({ force: true, v: true });
        expect(result).toEqual({ removed: 1, names: ['orphan-app-1'] });
    });

    it('leaves containers of known projects untouched', async () => {
        listContainers.mockResolvedValue([container('known')]);

        const result = await repository.removeOrphaned(['known']);

        expect(getContainer).not.toHaveBeenCalled();
        expect(remove).not.toHaveBeenCalled();
        expect(result).toEqual({ removed: 0, names: [] });
    });

    it('removes only the orphaned ones from a mixed set', async () => {
        listContainers.mockResolvedValue([
            container('known'),
            container('orphan-a'),
            container('orphan-b'),
        ]);

        const result = await repository.removeOrphaned(['known']);

        expect(remove).toHaveBeenCalledTimes(2);
        expect(result).toEqual({ removed: 2, names: ['orphan-a-app-1', 'orphan-b-app-1'] });
    });

    it('catches and logs a per-container removal failure without aborting the rest', async () => {
        listContainers.mockResolvedValue([
            container('orphan-a'),
            container('orphan-b'),
        ]);
        remove.mockRejectedValueOnce(new Error('container is restarting'));

        const result = await repository.removeOrphaned([]);

        expect(remove).toHaveBeenCalledTimes(2);
        expect(diagnostics.warn).toHaveBeenCalledTimes(1);
        expect(result).toEqual({ removed: 1, names: ['orphan-b-app-1'] });
    });

    it('falls back to the short id when the container has no names', async () => {
        listContainers.mockResolvedValue([
            { Id: 'abcdef0123456789', Names: [], Labels: { [COMPOSE_PROJECT_LABEL]: 'orphan' } },
        ]);

        const result = await repository.removeOrphaned([]);

        expect(result).toEqual({ removed: 1, names: ['abcdef012345'] });
    });

    it('logs a summary of how many containers were removed', async () => {
        listContainers.mockResolvedValue([container('orphan')]);

        await repository.removeOrphaned([]);

        expect(diagnostics.log).toHaveBeenCalledWith(
            'Removed 1 orphaned container(s) from the VPS',
            'DockerOrphanContainersRepository',
        );
    });
});
