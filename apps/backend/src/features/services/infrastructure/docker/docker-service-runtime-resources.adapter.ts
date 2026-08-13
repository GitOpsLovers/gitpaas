import { Inject, Injectable } from '@nestjs/common';

import { Service } from '../../domain/models/service.models';
import { ServiceRuntimeResources } from '../../domain/ports/service-runtime-resources.port';

import { GITPAAS_PROJECT_LABEL } from '@core/domain/constants/gitpaas-labels.constants';
import type { RuntimeSelector } from '@core/domain/models/container-runtime.models';
import type { ContainerRuntime } from '@core/domain/ports/container-runtime.port';
import { DockerContainerRuntimeAdapter } from '@core/infrastructure/docker/docker-container-runtime.adapter';
import { getGitpaasLabels } from '@shared/application/get-gitpaas-labels.use-case';
import { getServiceSlug } from '@shared/application/get-service-slug.use-case';

/**
 * Docker service runtime resources adapter.
 */
@Injectable()
export class DockerServiceRuntimeResourcesAdapter implements ServiceRuntimeResources {
    constructor(
        @Inject(DockerContainerRuntimeAdapter)
        private readonly client: ContainerRuntime,
    ) {}

    public async removeContainers(service: Service): Promise<void> {
        const projectName = getServiceSlug(service);
        const selector: RuntimeSelector = { labels: getGitpaasLabels(), project: projectName };

        try {
            const containers = await this.client.listContainers(selector, true);

            for (const container of containers) {
                try {
                    await this.client.removeContainer(container.id, { force: true, removeVolumes: true });
                } catch {
                    // Best-effort cleanup: the failed call is already counted in `deps.docker.errors`.
                }
            }
        } catch {
            // Best-effort cleanup: the failed call is already counted in `deps.docker.errors`.
        }
    }

    public async removeNetworks(service: Service): Promise<void> {
        const projectName = getServiceSlug(service);
        const selector: RuntimeSelector = { labels: getGitpaasLabels(), project: projectName };

        try {
            const networks = await this.client.listNetworks(selector);

            for (const network of networks) {
                try {
                    await this.client.removeNetwork(network.id);
                } catch {
                    // Best-effort cleanup: the failed call is already counted in `deps.docker.errors`.
                }
            }
        } catch {
            // Best-effort cleanup: the failed call is already counted in `deps.docker.errors`.
        }
    }

    public async removeImages(service: Service): Promise<void> {
        const projectName = getServiceSlug(service);

        try {
            const labels = {
                ...getGitpaasLabels(),
                [GITPAAS_PROJECT_LABEL]: projectName,
            };
            const builtImages = await this.client.listImages({ labels });

            for (const image of builtImages) {
                try {
                    await this.client.removeImage(image.id, { force: true });
                } catch {
                    // Best-effort cleanup: the failed call is already counted in `deps.docker.errors`.
                }
            }
        } catch {
            // Best-effort cleanup: the failed call is already counted in `deps.docker.errors`.
        }
    }
}
