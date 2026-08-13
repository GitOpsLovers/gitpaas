import { Service } from '../../../domain/models/service.models';
import { DockerServiceRuntimeResourcesAdapter } from '../docker-service-runtime-resources.adapter';

import {
    GITPAAS_MANAGED_LABEL,
    GITPAAS_MANAGED_VALUE,
    GITPAAS_PROJECT_LABEL,
} from '@core/domain/constants/gitpaas-labels.constants';
import type {
    RuntimeContainerSummary,
    RuntimeImageSummary,
    RuntimeNetworkSummary,
    RuntimeSelector,
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
 * Applies a runtime selector to a resource's labels exactly as the daemon does
 * once the adapter has serialised it: every selector label must match (a `null`
 * value only requires the label to be present) and a project scope is matched on
 * the compose project label. Lets a test drive the SUT against a realistic,
 * unfiltered host resource set.
 */
const matchesSelector = (labels: Record<string, string> | undefined, selector: RuntimeSelector): boolean => {
    const owned = labels ?? {};
    const required = {
        ...selector.labels,
        ...(selector.project === undefined ? {} : { [COMPOSE_PROJECT_LABEL]: selector.project }),
    };

    return Object.entries(required).every(([key, value]) => (value === null ? key in owned : owned[key] === value));
};

describe('DockerServiceRuntimeResourcesAdapter', () => {
    const service: Service = {
        id: '3f2504e0-4f89-41d3-9a0c-0305e82c3301',
        name: 'My Service!',
        projectId: 'b2a2132b-d6b7-464a-8aaf-c659a3ca0d60',
        repositoryId: '42',
        deploymentBranch: 'main',
        composerPath: 'docker-compose.yml',
    };
    const projectName = 'my-service';
    const projectSelector = { labels: managedLabels, project: projectName };
    const imageSelector = { labels: { ...managedLabels, [GITPAAS_PROJECT_LABEL]: projectName } };

    let mockListContainers: jest.Mock;
    let mockListNetworks: jest.Mock;
    let mockListImages: jest.Mock;
    let mockRemoveContainer: jest.Mock;
    let mockRemoveNetwork: jest.Mock;
    let mockRemoveImage: jest.Mock;
    let mockContainerRuntime: jest.Mocked<Pick<
        DockerContainerRuntimeAdapter,
        'listContainers' | 'listNetworks' | 'listImages' | 'removeContainer' | 'removeNetwork' | 'removeImage'
    >>;
    let sut: DockerServiceRuntimeResourcesAdapter;

    beforeEach(() => {
        jest.clearAllMocks();

        mockListContainers = jest.fn().mockResolvedValue([]);
        mockListNetworks = jest.fn().mockResolvedValue([]);
        mockListImages = jest.fn().mockResolvedValue([]);
        mockRemoveContainer = jest.fn().mockResolvedValue(undefined);
        mockRemoveNetwork = jest.fn().mockResolvedValue(undefined);
        mockRemoveImage = jest.fn().mockResolvedValue(undefined);

        mockContainerRuntime = {
            listContainers: mockListContainers,
            listNetworks: mockListNetworks,
            listImages: mockListImages,
            removeContainer: mockRemoveContainer,
            removeNetwork: mockRemoveNetwork,
            removeImage: mockRemoveImage,
        };

        sut = new DockerServiceRuntimeResourcesAdapter(mockContainerRuntime as unknown as DockerContainerRuntimeAdapter);
    });

    describe('removeContainers', () => {
        it('lists containers scoped to the GitPaaS marker and the service project', async () => {
            await sut.removeContainers(service);

            expect(mockListContainers).toHaveBeenCalledWith(projectSelector, true);
        });

        it('falls back to a service-<id> project when the name slugifies to empty', async () => {
            const unnamed: Service = { ...service, name: '!!!' };

            await sut.removeContainers(unnamed);

            expect(mockListContainers).toHaveBeenCalledWith({ labels: managedLabels, project: `service-${unnamed.id}` }, true);
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
        it('lists networks scoped to the GitPaaS marker and the service project', async () => {
            await sut.removeNetworks(service);

            expect(mockListNetworks).toHaveBeenCalledWith(projectSelector);
        });

        it('falls back to a service-<id> project when the name slugifies to empty', async () => {
            const unnamed: Service = { ...service, name: '!!!' };

            await sut.removeNetworks(unnamed);

            expect(mockListNetworks).toHaveBeenCalledWith({ labels: managedLabels, project: `service-${unnamed.id}` });
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

    describe('removeImages', () => {
        it('asks the runtime for the project\'s GitPaaS-labelled images only', async () => {
            await sut.removeImages(service);

            expect(mockListImages).toHaveBeenCalledWith(imageSelector);
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

            expect(Object.keys(selector)).toEqual(['labels']);
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
        /** Image GitPaaS built for this service: labelled, so it is the teardown target. */
        const builtImage = {
            id: 'img-built',
            labels: { [GITPAAS_MANAGED_LABEL]: GITPAAS_MANAGED_VALUE, [GITPAAS_PROJECT_LABEL]: projectName },
        };
        /**
         * Unrelated host image that happens to share the `<projectName>_` tag
         * prefix the old heuristic matched on. It carries no GitPaaS labels, so it
         * must survive — this is the regression the label filter replaced.
         */
        const lookalikeImage = { id: 'img-lookalike', labels: {} };
        /** Another service's GitPaaS-built image: marked, but for a different project. */
        const otherProjectImage = {
            id: 'img-other',
            labels: { [GITPAAS_MANAGED_LABEL]: GITPAAS_MANAGED_VALUE, [GITPAAS_PROJECT_LABEL]: 'other-service' },
        };
        /** Shared pulled base image, unlabelled and never GitPaaS's to remove. */
        const pulledImage = { id: 'img-node', labels: undefined };

        /** GitPaaS's own container for the project. */
        const ownContainer = {
            id: 'ctr-own',
            labels: { [GITPAAS_MANAGED_LABEL]: GITPAAS_MANAGED_VALUE, [COMPOSE_PROJECT_LABEL]: projectName },
        };
        /** A third-party container grouped under the very same compose project name. */
        const foreignContainer = { id: 'ctr-foreign', labels: { [COMPOSE_PROJECT_LABEL]: projectName } };

        beforeEach(() => {
            mockListImages.mockImplementation((selector: RuntimeSelector) => Promise.resolve(
                [builtImage, lookalikeImage, otherProjectImage, pulledImage]
                    .filter((image) => matchesSelector(image.labels, selector))
                    .map((image) => imageSummary(image.id)),
            ));
            mockListContainers.mockImplementation((selector: RuntimeSelector) => Promise.resolve(
                [ownContainer, foreignContainer]
                    .filter((container) => matchesSelector(container.labels, selector))
                    .map((container) => containerSummary(container.id)),
            ));
        });

        it('removes only the project\'s GitPaaS-labelled image, sparing a same-prefix host image', async () => {
            await sut.removeImages(service);

            expect(mockRemoveImage).toHaveBeenCalledTimes(1);
            expect(mockRemoveImage).toHaveBeenCalledWith('img-built', { force: true });
            expect(mockRemoveImage).not.toHaveBeenCalledWith('img-lookalike', expect.anything());
            expect(mockRemoveImage).not.toHaveBeenCalledWith('img-other', expect.anything());
            expect(mockRemoveImage).not.toHaveBeenCalledWith('img-node', expect.anything());
        });

        it('removes only its own container, sparing a foreign container sharing the compose project name', async () => {
            await sut.removeContainers(service);

            expect(mockRemoveContainer).toHaveBeenCalledTimes(1);
            expect(mockRemoveContainer).toHaveBeenCalledWith('ctr-own', { force: true, removeVolumes: true });
            expect(mockRemoveContainer).not.toHaveBeenCalledWith('ctr-foreign', expect.anything());
        });

    });
});
