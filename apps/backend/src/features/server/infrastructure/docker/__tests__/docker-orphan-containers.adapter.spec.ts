/* eslint-disable no-secrets/no-secrets */
import { DockerOrphanContainersAdapter } from '../docker-orphan-containers.adapter';

import {
    GITPAAS_MANAGED_LABEL,
    GITPAAS_MANAGED_VALUE,
    GITPAAS_PROJECT_LABEL,
} from '@core/domain/constants/gitpaas-labels.constants';
import type { RuntimeContainerSummary, RuntimeSelector } from '@core/domain/models/container-runtime.models';
import type { AppLogger } from '@core/domain/ports/app-logger.port';
import { DockerContainerRuntimeAdapter } from '@core/infrastructure/docker/docker-container-runtime.adapter';

/** Compose project label the runtime maps a project scope onto, kept here to describe host containers. */
const COMPOSE_PROJECT_LABEL = 'com.docker.compose.project';

/**
 * Builds a container summary as the runtime reports it: the GitPaaS project
 * first, then the compose one, exactly as the executor stamps them at creation
 * time.
 */
const containerSummary = (
    project: string,
    overrides: { id?: string; names?: string[]; projects?: string[] } = {},
): RuntimeContainerSummary => ({
    id: overrides.id ?? `id-${project}`,
    names: overrides.names ?? [`/${project}-app-1`],
    image: 'app:latest',
    state: 'running',
    status: 'Up 3 minutes',
    createdAt: new Date('2025-07-11T00:00:00.000Z'),
    projects: overrides.projects ?? [project, project],
    ports: [],
});

/**
 * Builds a host container described by its labels, standing in for any container
 * on the host — GitPaaS-managed or not — together with the summary the runtime
 * would report for it.
 */
const hostContainer = (name: string, labels: Record<string, string>): { labels: Record<string, string>; summary: RuntimeContainerSummary } => ({
    labels,
    summary: containerSummary(name, {
        id: `id-${name}`,
        names: [`/${name}`],
        // eslint-disable-next-line security/detect-object-injection
        projects: [labels[GITPAAS_PROJECT_LABEL], labels[COMPOSE_PROJECT_LABEL]].filter((project) => project !== undefined),
    }),
});

/**
 * Applies a runtime selector to a container's labels exactly as the daemon does
 * once the adapter has serialised it: every selector label must match (a `null`
 * value only requires the label to be present) and a `null` project scope
 * requires the compose project label to be there at all. Lets a test drive the
 * SUT against a realistic, unfiltered host container set.
 */
const matchesSelector = (labels: Record<string, string>, selector: RuntimeSelector): boolean => {
    const required = { ...selector.labels, ...(selector.project === undefined ? {} : { [COMPOSE_PROJECT_LABEL]: selector.project }) };

    // eslint-disable-next-line security/detect-object-injection
    return Object.entries(required).every(([key, value]) => (value === null ? key in labels : labels[key] === value));
};

describe('DockerOrphanContainersAdapter', () => {
    let mockListContainers: jest.Mock;
    let mockRemoveContainer: jest.Mock;
    let mockContainerRuntime: jest.Mocked<Pick<DockerContainerRuntimeAdapter, 'listContainers' | 'removeContainer'>>;
    let mockLogger: jest.Mocked<AppLogger>;
    let sut: DockerOrphanContainersAdapter;

    beforeEach(() => {
        jest.clearAllMocks();

        mockListContainers = jest.fn().mockResolvedValue([]);
        mockRemoveContainer = jest.fn().mockResolvedValue(undefined);
        mockContainerRuntime = {
            listContainers: mockListContainers,
            removeContainer: mockRemoveContainer,
        };
        mockLogger = {
            debug: jest.fn(), log: jest.fn(), warn: jest.fn(), error: jest.fn(),
        };
        sut = new DockerOrphanContainersAdapter(
            mockContainerRuntime as unknown as DockerContainerRuntimeAdapter,
            mockLogger,
        );
    });

    it('lists only GitPaaS-managed containers belonging to some project, all states included', async () => {
        await sut.removeOrphaned([]);

        expect(mockListContainers).toHaveBeenCalledTimes(1);
        expect(mockListContainers).toHaveBeenCalledWith(
            { labels: { [GITPAAS_MANAGED_LABEL]: GITPAAS_MANAGED_VALUE }, project: null },
            true,
        );
    });

    it('force-removes containers whose project is not known, dropping volumes', async () => {
        mockListContainers.mockResolvedValue([containerSummary('orphan')]);

        const result = await sut.removeOrphaned(['known']);

        expect(mockRemoveContainer).toHaveBeenCalledWith('id-orphan', { force: true, removeVolumes: true });
        expect(result).toEqual({ removed: 1, names: ['orphan-app-1'] });
    });

    it('leaves containers of known projects untouched', async () => {
        mockListContainers.mockResolvedValue([containerSummary('known')]);

        const result = await sut.removeOrphaned(['known']);

        expect(mockRemoveContainer).not.toHaveBeenCalled();
        expect(result).toEqual({ removed: 0, names: [] });
    });

    it('reads the project the runtime reports first, in preference to the later ones', async () => {
        mockListContainers.mockResolvedValue([
            containerSummary('mismatch', { projects: ['known', 'stale'] }),
        ]);

        const result = await sut.removeOrphaned(['known']);

        expect(mockRemoveContainer).not.toHaveBeenCalled();
        expect(result).toEqual({ removed: 0, names: [] });
    });

    it('falls back to the next reported project when the GitPaaS one is absent', async () => {
        mockListContainers.mockResolvedValue([
            containerSummary('known', { projects: ['known'] }),
        ]);

        const result = await sut.removeOrphaned(['known']);

        expect(mockRemoveContainer).not.toHaveBeenCalled();
        expect(result).toEqual({ removed: 0, names: [] });
    });

    it.each(['gitpaas', 'gitpaas-dev'])(
        'never removes the "%s" control-plane project, whichever label carries it',
        async (project) => {
            mockListContainers.mockResolvedValue([
                containerSummary(project),
                containerSummary(`${project}-compose-only`, { projects: [project] }),
                containerSummary(`${project}-mislabelled`, { projects: ['stale', project] }),
            ]);

            const result = await sut.removeOrphaned([]);

            expect(mockRemoveContainer).not.toHaveBeenCalled();
            expect(result).toEqual({ removed: 0, names: [] });
        },
    );

    it('removes only the orphaned ones from a mixed set', async () => {
        mockListContainers.mockResolvedValue([
            containerSummary('known'),
            containerSummary('orphan-a'),
            containerSummary('orphan-b'),
        ]);

        const result = await sut.removeOrphaned(['known']);

        expect(mockRemoveContainer).toHaveBeenCalledTimes(2);
        expect(result).toEqual({ removed: 2, names: ['orphan-a-app-1', 'orphan-b-app-1'] });
    });

    it('catches and logs a per-container removal failure without aborting the rest', async () => {
        mockListContainers.mockResolvedValue([
            containerSummary('orphan-a'),
            containerSummary('orphan-b'),
        ]);
        mockRemoveContainer.mockRejectedValueOnce(new Error('container is restarting'));

        const result = await sut.removeOrphaned([]);

        expect(mockRemoveContainer).toHaveBeenCalledTimes(2);
        expect(mockLogger.warn).toHaveBeenCalledTimes(1);
        expect(result).toEqual({ removed: 1, names: ['orphan-b-app-1'] });
    });

    it('keeps the removal failure in the warning instead of discarding it', async () => {
        mockListContainers.mockResolvedValue([containerSummary('orphan-a')]);
        mockRemoveContainer.mockRejectedValueOnce(new Error('container is restarting'));

        await sut.removeOrphaned([]);

        expect(mockLogger.warn).toHaveBeenCalledTimes(1);
        expect(mockLogger.warn.mock.calls[0][0]).toContain('Error: container is restarting');
        expect(mockLogger.warn.mock.calls[0][1]).toBe('DockerOrphanContainersAdapter');
    });

    it('falls back to the short id when the container has no names', async () => {
        mockListContainers.mockResolvedValue([
            containerSummary('orphan', { id: 'abcdef0123456789', names: [] }),
        ]);

        const result = await sut.removeOrphaned([]);

        expect(result).toEqual({ removed: 1, names: ['abcdef012345'] });
    });

    describe('against an unfiltered host set, with the runtime honouring the selector', () => {
        /** Third-party compose stack on the host: no GitPaaS marker at all. */
        const thirdParty = hostContainer('unrelated-db-1', {
            [COMPOSE_PROJECT_LABEL]: 'unrelated-stack',
            'com.docker.compose.service': 'db',
        });
        /** The control plane as it exists today, deployed by hand without GitPaaS labels. */
        const unlabelledControlPlane = hostContainer('gitpaas-backend-1', { [COMPOSE_PROJECT_LABEL]: 'gitpaas' });
        /** A plain `docker run` container with no labels whatsoever. */
        const unlabelled = hostContainer('standalone-nginx', {});
        /** A GitPaaS container whose project still has a service behind it. */
        const known = hostContainer('known-app-1', {
            [GITPAAS_MANAGED_LABEL]: GITPAAS_MANAGED_VALUE,
            [GITPAAS_PROJECT_LABEL]: 'known',
            [COMPOSE_PROJECT_LABEL]: 'known',
        });
        /** A GitPaaS container whose service was deleted: the only legitimate target. */
        const orphan = hostContainer('orphan-app-1', {
            [GITPAAS_MANAGED_LABEL]: GITPAAS_MANAGED_VALUE,
            [GITPAAS_PROJECT_LABEL]: 'orphan',
            [COMPOSE_PROJECT_LABEL]: 'orphan',
        });
        /** A marked control-plane container: no service matches it, yet it is protected. */
        const markedControlPlane = hostContainer('gitpaas-dev-backend-1', {
            [GITPAAS_MANAGED_LABEL]: GITPAAS_MANAGED_VALUE,
            [GITPAAS_PROJECT_LABEL]: 'gitpaas-dev',
            [COMPOSE_PROJECT_LABEL]: 'gitpaas-dev',
        });
        /** Marked, but outside any compose stack, so it is out of the sweep's scope. */
        const markedWithoutComposeProject = hostContainer('gitpaas-oneoff', {
            [GITPAAS_MANAGED_LABEL]: GITPAAS_MANAGED_VALUE,
            [GITPAAS_PROJECT_LABEL]: 'oneoff',
        });

        const listing = (host: Array<{ labels: Record<string, string>; summary: RuntimeContainerSummary }>) => (
            (selector: RuntimeSelector): Promise<RuntimeContainerSummary[]> => Promise.resolve(
                host.filter((container) => matchesSelector(container.labels, selector)).map((container) => container.summary),
            )
        );

        beforeEach(() => {
            mockListContainers.mockImplementation(listing([
                thirdParty,
                unlabelledControlPlane,
                unlabelled,
                known,
                orphan,
                markedControlPlane,
                markedWithoutComposeProject,
            ]));
        });

        it('removes only the GitPaaS-managed orphan, sparing every unlabelled and control-plane container', async () => {
            const result = await sut.removeOrphaned(['known']);

            expect(result).toEqual({ removed: 1, names: ['orphan-app-1'] });
            expect(mockRemoveContainer).toHaveBeenCalledTimes(1);
            expect(mockRemoveContainer).toHaveBeenCalledWith('id-orphan-app-1', { force: true, removeVolumes: true });
        });

        it.each([
            ['an unlabelled third-party compose container', 'id-unrelated-db-1'],
            ['an unlabelled control-plane container', 'id-gitpaas-backend-1'],
            ['an unlabelled standalone container', 'id-standalone-nginx'],
            ['a marked container whose project still has a service', 'id-known-app-1'],
            ['a marked control-plane container', 'id-gitpaas-dev-backend-1'],
            ['a marked container outside any compose stack', 'id-gitpaas-oneoff'],
        ])('never touches %s', async (_case, id) => {
            await sut.removeOrphaned(['known']);

            expect(mockRemoveContainer).not.toHaveBeenCalledWith(id, expect.anything());
        });

        it('removes nothing at all when no service exists and every candidate is protected', async () => {
            mockListContainers.mockImplementation(
                listing([thirdParty, unlabelledControlPlane, unlabelled, markedControlPlane]),
            );

            const result = await sut.removeOrphaned([]);

            expect(mockRemoveContainer).not.toHaveBeenCalled();
            expect(result).toEqual({ removed: 0, names: [] });
        });
    });

    it('logs a summary of how many containers were removed', async () => {
        mockListContainers.mockResolvedValue([containerSummary('orphan')]);

        await sut.removeOrphaned([]);

        expect(mockLogger.log).toHaveBeenCalledWith(
            'Removed 1 orphaned container(s) from the server',
            'DockerOrphanContainersAdapter',
        );
    });
});
