import { Service } from '../../../domain/models/service.models';
import { DockerServiceRuntimeResourcesAdapter } from '../docker-service-runtime-resources.adapter';

import {
    GITPAAS_MANAGED_LABEL,
    GITPAAS_MANAGED_VALUE,
    GITPAAS_SERVICE_LABEL,
} from '@core/domain/constants/gitpaas-labels.constants';
import type {
    RuntimeContainerSummary,
    RuntimeImageSummary,
    RuntimeNetworkSummary,
    RuntimeSelector,
    RuntimeVolumeSummary,
} from '@core/domain/models/container-runtime.models';
import { DockerContainerRuntimeAdapter } from '@core/infrastructure/docker/docker-container-runtime.adapter';

/** Compose project label the runtime maps a project scope onto, kept here to describe host resources. */
const COMPOSE_PROJECT_LABEL = 'com.docker.compose.project';

/** GitPaaS ownership marker every query is scoped to. */
const managedLabels = { [GITPAAS_MANAGED_LABEL]: GITPAAS_MANAGED_VALUE };

/**
 * Builds a container summary carrying only the id the SUT reads.
 */
const containerSummary = (id: string): RuntimeContainerSummary => ({ id } as RuntimeContainerSummary);

/**
 * Builds a network summary carrying only the id the SUT reads.
 */
const networkSummary = (id: string): RuntimeNetworkSummary => ({ id } as RuntimeNetworkSummary);

/**
 * Builds an image summary carrying only the id the SUT reads (the runtime has
 * already filtered the list down to the project's GitPaaS-labelled images).
 */
const imageSummary = (id: string): RuntimeImageSummary => ({ id });

/**
 * Builds a volume summary carrying only the name the SUT reads.
 */
const volumeSummary = (name: string): RuntimeVolumeSummary => ({ name } as RuntimeVolumeSummary);

/**
 * Applies a runtime selector to a resource's labels exactly as the daemon does
 * once the adapter has serialised it: every selector label must match (a `null`
 * value only requires the label to be present), a project scope is matched on the
 * compose project label and a service scope on the label of the service. Lets a test drive the SUT against a realistic,
 * unfiltered host resource set.
 */
const matchesSelector = (labels: Record<string, string> | undefined, selector: RuntimeSelector): boolean => {
    const owned = labels ?? {};
    const required = {
        ...selector.labels,
        ...(selector.project === undefined ? {} : { [COMPOSE_PROJECT_LABEL]: selector.project }),
        ...(selector.service === undefined ? {} : { [GITPAAS_SERVICE_LABEL]: selector.service }),
    };

    // eslint-disable-next-line security/detect-object-injection
    return Object.entries(required).every(([key, value]) => (value === null ? key in owned : owned[key] === value));
};

describe('DockerServiceRuntimeResourcesAdapter', () => {
    const service: Service = {
        id: '3f2504e0-4f89-41d3-9a0c-0305e82c3301',
        name: 'My Service!',
        description: '',
        projectId: 'b2a2132b-d6b7-464a-8aaf-c659a3ca0d60',
        providerId: 'c3d4e5f6-a7b8-4c9d-8e1f-2a3b4c5d6e7f',
        composeProject: 'gitpaas_web',
        repositoryId: '42',
        deploymentBranch: 'main',
        composerPath: 'docker-compose.yml',
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
    };
    /** Name of the compose project of the service, which its siblings of the same project share. */
    const projectName = service.composeProject;
    /** Prefix every volume of the service carries on the daemon, which Compose builds from its project alone. */
    const volumePrefix = projectName;
    /** Selector that scopes every teardown to the one service, and never to its compose project. */
    const serviceSelector = { labels: managedLabels, service: service.id };
    /** A sibling service of the very same compose project, whose resources the teardown must spare. */
    const siblingServiceId = 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d';

    let mockListContainers: jest.Mock;
    let mockListNetworks: jest.Mock;
    let mockListImages: jest.Mock;
    let mockListVolumes: jest.Mock;
    let mockRemoveContainer: jest.Mock;
    let mockRemoveNetwork: jest.Mock;
    let mockRemoveImage: jest.Mock;
    let mockRemoveVolume: jest.Mock;
    let mockDisconnectNetwork: jest.Mock;
    let mockContainerRuntime: jest.Mocked<Pick<
        DockerContainerRuntimeAdapter,
        'listContainers' | 'listNetworks' | 'listImages' | 'listVolumes' | 'removeContainer' | 'removeNetwork' | 'removeImage' | 'removeVolume' | 'disconnectNetwork'
    >>;
    let sut: DockerServiceRuntimeResourcesAdapter;

    beforeEach(() => {
        jest.clearAllMocks();

        mockListContainers = jest.fn().mockResolvedValue([]);
        mockListNetworks = jest.fn().mockResolvedValue([]);
        mockListImages = jest.fn().mockResolvedValue([]);
        mockListVolumes = jest.fn().mockResolvedValue([]);
        mockRemoveContainer = jest.fn().mockResolvedValue(undefined);
        mockRemoveNetwork = jest.fn().mockResolvedValue(undefined);
        mockRemoveImage = jest.fn().mockResolvedValue(undefined);
        mockRemoveVolume = jest.fn().mockResolvedValue(undefined);
        mockDisconnectNetwork = jest.fn().mockResolvedValue(undefined);

        mockContainerRuntime = {
            listContainers: mockListContainers,
            listNetworks: mockListNetworks,
            listImages: mockListImages,
            listVolumes: mockListVolumes,
            removeContainer: mockRemoveContainer,
            removeNetwork: mockRemoveNetwork,
            removeImage: mockRemoveImage,
            removeVolume: mockRemoveVolume,
            disconnectNetwork: mockDisconnectNetwork,
        };

        sut = new DockerServiceRuntimeResourcesAdapter(mockContainerRuntime as unknown as DockerContainerRuntimeAdapter);
    });

    describe('removeRouting', () => {
        it('lists containers scoped to the GitPaaS marker and the identifier of the service', async () => {
            await sut.removeRouting(service);

            expect(mockListContainers).toHaveBeenCalledWith(serviceSelector, true);
        });

        it('detaches every container of the service from the network of the proxy', async () => {
            mockListContainers.mockResolvedValue([containerSummary('c1'), containerSummary('c2')]);

            await sut.removeRouting(service);

            expect(mockDisconnectNetwork).toHaveBeenCalledTimes(2);
            expect(mockDisconnectNetwork).toHaveBeenCalledWith('gitpaas-proxy', 'c1');
            expect(mockDisconnectNetwork).toHaveBeenCalledWith('gitpaas-proxy', 'c2');
        });

        it('never detaches a container from a network of its project', async () => {
            mockListContainers.mockResolvedValue([containerSummary('c1')]);

            await sut.removeRouting(service);

            // The network of the project survives the unrouting: only the network of the proxy goes away.
            expect(mockDisconnectNetwork.mock.calls).toEqual([['gitpaas-proxy', 'c1']]);
        });

        it('catches a container that never joined the proxy and continues with the rest', async () => {
            mockListContainers.mockResolvedValue([containerSummary('c1'), containerSummary('c2')]);
            mockDisconnectNetwork.mockRejectedValueOnce(new Error('container is not connected to the network'));

            await expect(sut.removeRouting(service)).resolves.toBeUndefined();

            expect(mockDisconnectNetwork).toHaveBeenCalledTimes(2);
        });

        it('does not throw when the runtime is unreachable while listing', async () => {
            mockListContainers.mockRejectedValue(new Error('daemon down'));

            await expect(sut.removeRouting(service)).resolves.toBeUndefined();

            expect(mockDisconnectNetwork).not.toHaveBeenCalled();
        });
    });

    describe('removeContainers', () => {
        it('lists containers scoped to the GitPaaS marker and the identifier of the service', async () => {
            await sut.removeContainers(service);

            expect(mockListContainers).toHaveBeenCalledWith(serviceSelector, true);
        });

        it('force-removes each container of the service', async () => {
            mockListContainers.mockResolvedValue([containerSummary('c1'), containerSummary('c2')]);

            await sut.removeContainers(service);

            expect(mockRemoveContainer).toHaveBeenCalledTimes(2);
            expect(mockRemoveContainer).toHaveBeenCalledWith('c1', { force: true, removeVolumes: true });
            expect(mockRemoveContainer).toHaveBeenCalledWith('c2', { force: true, removeVolumes: true });
        });

        it('catches a single container failure and continues with the rest', async () => {
            mockListContainers.mockResolvedValue([containerSummary('c1'), containerSummary('c2')]);
            mockRemoveContainer.mockRejectedValueOnce(new Error('boom'));

            await expect(sut.removeContainers(service)).resolves.toBeUndefined();

            expect(mockRemoveContainer).toHaveBeenCalledTimes(2);
        });

        it('does not throw when the runtime is unreachable while listing', async () => {
            mockListContainers.mockRejectedValue(new Error('daemon down'));

            await expect(sut.removeContainers(service)).resolves.toBeUndefined();

            expect(mockRemoveContainer).not.toHaveBeenCalled();
        });
    });

    describe('removeNetworks', () => {
        it('lists networks scoped to the GitPaaS marker and the identifier of the service', async () => {
            await sut.removeNetworks(service);

            expect(mockListNetworks).toHaveBeenCalledWith(serviceSelector);
        });

        it('removes each compose network of the service', async () => {
            mockListNetworks.mockResolvedValue([networkSummary('n1')]);

            await sut.removeNetworks(service);

            expect(mockRemoveNetwork).toHaveBeenCalledTimes(1);
            expect(mockRemoveNetwork).toHaveBeenCalledWith('n1');
        });

        it('catches a single network failure and continues with the rest', async () => {
            mockListNetworks.mockResolvedValue([networkSummary('n1'), networkSummary('n2')]);
            mockRemoveNetwork.mockRejectedValueOnce(new Error('boom'));

            await expect(sut.removeNetworks(service)).resolves.toBeUndefined();

            expect(mockRemoveNetwork).toHaveBeenCalledTimes(2);
        });

        it('does not throw when the runtime is unreachable while listing', async () => {
            mockListNetworks.mockRejectedValue(new Error('daemon down'));

            await expect(sut.removeNetworks(service)).resolves.toBeUndefined();

            expect(mockRemoveNetwork).not.toHaveBeenCalled();
        });
    });

    describe('removeVolumes', () => {
        /** Name on the daemon of a volume of the service, which Compose prefixes with the name of its project. */
        const ownedName = `${volumePrefix}_pgdata`;

        it('lists volumes scoped to the GitPaaS marker and the identifier of the service', async () => {
            await sut.removeVolumes(service);

            expect(mockListVolumes).toHaveBeenCalledWith(serviceSelector);
        });

        it('removes every volume the runtime reports for the service, by its name on the daemon', async () => {
            const secondName = `${volumePrefix}_uploads`;
            mockListVolumes.mockResolvedValue([volumeSummary(ownedName), volumeSummary(secondName)]);

            await sut.removeVolumes(service);

            expect(mockRemoveVolume).toHaveBeenCalledTimes(2);
            expect(mockRemoveVolume).toHaveBeenCalledWith(ownedName);
            expect(mockRemoveVolume).toHaveBeenCalledWith(secondName);
        });

        it('removes a volume the Compose file of the user declares, whatever the shape of its key', async () => {
            mockListVolumes.mockResolvedValue([volumeSummary(`${projectName}_pg_data`), volumeSummary('pgdata')]);

            await sut.removeVolumes(service);

            expect(mockRemoveVolume).toHaveBeenCalledTimes(2);
            expect(mockRemoveVolume).toHaveBeenCalledWith(`${projectName}_pg_data`);
            expect(mockRemoveVolume).toHaveBeenCalledWith('pgdata');
        });

        it('catches a single volume failure and continues with the rest', async () => {
            const secondName = `${volumePrefix}_uploads`;
            mockListVolumes.mockResolvedValue([volumeSummary(ownedName), volumeSummary(secondName)]);
            mockRemoveVolume.mockRejectedValueOnce(new Error('volume is in use'));

            await expect(sut.removeVolumes(service)).resolves.toBeUndefined();

            expect(mockRemoveVolume).toHaveBeenCalledTimes(2);
            expect(mockRemoveVolume).toHaveBeenCalledWith(secondName);
        });

        it('does not throw when the runtime is unreachable while listing', async () => {
            mockListVolumes.mockRejectedValue(new Error('daemon down'));

            await expect(sut.removeVolumes(service)).resolves.toBeUndefined();

            expect(mockRemoveVolume).not.toHaveBeenCalled();
        });
    });

    describe('removeImages', () => {
        it('asks the runtime for the GitPaaS-labelled images of the service only', async () => {
            await sut.removeImages(service);

            expect(mockListImages).toHaveBeenCalledWith(serviceSelector);
        });

        it('removes every image the runtime reports for the project', async () => {
            mockListImages.mockResolvedValue([imageSummary('img-built-app'), imageSummary('img-built-worker')]);

            await sut.removeImages(service);

            expect(mockRemoveImage).toHaveBeenCalledTimes(2);
            expect(mockRemoveImage).toHaveBeenCalledWith('img-built-app', { force: true });
            expect(mockRemoveImage).toHaveBeenCalledWith('img-built-worker', { force: true });
        });

        it('scopes the image query by label only, never by an image tag/reference heuristic', async () => {
            await sut.removeImages(service);

            const [selector] = mockListImages.mock.calls[0] as [RuntimeSelector];

            expect(Object.keys(selector)).toEqual(['labels', 'service']);
            expect(selector).not.toHaveProperty('reference');
        });

        it('catches a single image failure and continues with the rest', async () => {
            mockListImages.mockResolvedValue([imageSummary('img-1'), imageSummary('img-2')]);
            mockRemoveImage.mockRejectedValueOnce(new Error('boom'));

            await expect(sut.removeImages(service)).resolves.toBeUndefined();

            expect(mockRemoveImage).toHaveBeenCalledTimes(2);
        });

        it('does not throw when the runtime is unreachable while listing', async () => {
            mockListImages.mockRejectedValue(new Error('daemon down'));

            await expect(sut.removeImages(service)).resolves.toBeUndefined();

            expect(mockRemoveImage).not.toHaveBeenCalled();
        });
    });

    describe('against an unfiltered host set, with the runtime honouring the selector', () => {
        /** Labels every resource of the service under test carries. */
        const ownLabels = {
            [GITPAAS_MANAGED_LABEL]: GITPAAS_MANAGED_VALUE,
            [GITPAAS_SERVICE_LABEL]: service.id,
            [COMPOSE_PROJECT_LABEL]: projectName,
        };
        /** Labels a sibling service of the very same compose project carries. */
        const siblingLabels = {
            [GITPAAS_MANAGED_LABEL]: GITPAAS_MANAGED_VALUE,
            [GITPAAS_SERVICE_LABEL]: siblingServiceId,
            [COMPOSE_PROJECT_LABEL]: projectName,
        };

        /** Image GitPaaS built for this service: labelled, so it is the teardown target. */
        const builtImage = { id: 'img-built', labels: ownLabels };
        /**
         * Unrelated host image that happens to share the `<projectName>_` tag
         * prefix the old heuristic matched on. It carries no GitPaaS labels, so it
         * must survive — this is the regression the label filter replaced.
         */
        const lookalikeImage = { id: 'img-lookalike', labels: {} };
        /** Image of a sibling service of the same compose project: marked, but not this service's. */
        const siblingImage = { id: 'img-sibling', labels: siblingLabels };
        /** Shared pulled base image, unlabelled and never GitPaaS's to remove. */
        const pulledImage = { id: 'img-node', labels: undefined };

        /** GitPaaS's own container for the service. */
        const ownContainer = { id: 'ctr-own', labels: ownLabels };
        /** A third-party container grouped under the very same compose project name. */
        const foreignContainer = { id: 'ctr-foreign', labels: { [COMPOSE_PROJECT_LABEL]: projectName } };
        /** Container of a sibling service of the same compose project, which must keep running. */
        const siblingContainer = { id: 'ctr-sibling', labels: siblingLabels };

        /** Volume Compose created for this service, marked with the labels of GitPaaS. */
        const ownedVolume = { name: `${volumePrefix}_pgdata`, labels: ownLabels };
        /** Second volume of the stack of this service, marked the very same way. */
        const composeVolume = { name: `${volumePrefix}_uploads`, labels: ownLabels };
        /** Volume of a sibling service of the same compose project, marked but not this service's. */
        const siblingVolume = { name: 'gitpaas_other-service_pgdata', labels: siblingLabels };
        /** Unlabelled host volume from `docker volume create`, never GitPaaS's to remove. */
        const hostVolume = { name: `${volumePrefix}_stray`, labels: undefined };

        beforeEach(() => {
            mockListImages.mockImplementation((selector: RuntimeSelector) => Promise.resolve(
                [builtImage, lookalikeImage, siblingImage, pulledImage]
                    .filter((image) => matchesSelector(image.labels, selector))
                    .map((image) => imageSummary(image.id)),
            ));
            mockListContainers.mockImplementation((selector: RuntimeSelector) => Promise.resolve(
                [ownContainer, foreignContainer, siblingContainer]
                    .filter((container) => matchesSelector(container.labels, selector))
                    .map((container) => containerSummary(container.id)),
            ));
            mockListVolumes.mockImplementation((selector: RuntimeSelector) => Promise.resolve(
                [ownedVolume, composeVolume, siblingVolume, hostVolume]
                    .filter((volume) => matchesSelector(volume.labels, selector))
                    .map((volume) => volumeSummary(volume.name)),
            ));
        });

        it('removes only the image of the service, sparing a same-prefix host image and the image of a sibling', async () => {
            await sut.removeImages(service);

            expect(mockRemoveImage).toHaveBeenCalledTimes(1);
            expect(mockRemoveImage).toHaveBeenCalledWith('img-built', { force: true });
            expect(mockRemoveImage).not.toHaveBeenCalledWith('img-lookalike', expect.anything());
            expect(mockRemoveImage).not.toHaveBeenCalledWith('img-sibling', expect.anything());
            expect(mockRemoveImage).not.toHaveBeenCalledWith('img-node', expect.anything());
        });

        it('removes only its own container, sparing a foreign one and a sibling sharing the compose project name', async () => {
            await sut.removeContainers(service);

            expect(mockRemoveContainer).toHaveBeenCalledTimes(1);
            expect(mockRemoveContainer).toHaveBeenCalledWith('ctr-own', { force: true, removeVolumes: true });
            expect(mockRemoveContainer).not.toHaveBeenCalledWith('ctr-foreign', expect.anything());
            expect(mockRemoveContainer).not.toHaveBeenCalledWith('ctr-sibling', expect.anything());
        });

        it('removes every volume of its own stack, sparing a sibling and an unlabelled host volume', async () => {
            await sut.removeVolumes(service);

            expect(mockRemoveVolume).toHaveBeenCalledTimes(2);
            expect(mockRemoveVolume).toHaveBeenCalledWith(ownedVolume.name);
            expect(mockRemoveVolume).toHaveBeenCalledWith(composeVolume.name);
            expect(mockRemoveVolume).not.toHaveBeenCalledWith(siblingVolume.name);
            expect(mockRemoveVolume).not.toHaveBeenCalledWith(hostVolume.name);
        });
    });
});
