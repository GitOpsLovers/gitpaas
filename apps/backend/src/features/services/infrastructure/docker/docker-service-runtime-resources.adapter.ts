import { Inject, Injectable } from '@nestjs/common';

import { Service } from '../../domain/models/service.models';
import { ServiceRuntimeResources } from '../../domain/ports/service-runtime-resources.port';

import { selectOwnedResourcesUseCase } from '@core/application/select-owned-resources.use-case';
import { serviceProjectNameUseCase } from '@core/application/service-project-name.use-case';
import { GITPAAS_PROJECT_LABEL } from '@core/domain/constants/gitpaas-labels.constants';
import type { RuntimeSelector } from '@core/domain/models/container-runtime.models';
import type { ContainerRuntime } from '@core/domain/ports/container-runtime.port';
import { DockerContainerRuntimeAdapter } from '@core/infrastructure/docker/container-runtime-docker.adapter';
import { DiagnosticLoggerService } from '@core/ui/services/diagnostic-logger.service';

/**
 * Docker service runtime resources adapter.
 */
@Injectable()
export class DockerServiceRuntimeResourcesAdapter implements ServiceRuntimeResources {
    constructor(
        @Inject(DockerContainerRuntimeAdapter)
        private readonly client: ContainerRuntime,
        private readonly diagnostics: DiagnosticLoggerService,
    ) {}

    public async removeContainers(service: Service): Promise<void> {
        const projectName = serviceProjectNameUseCase(service);
        const selector: RuntimeSelector = { labels: selectOwnedResourcesUseCase(), project: projectName };

        let containersRemoved = 0;

        try {
            const containers = await this.client.listContainers(selector, true);

            for (const container of containers) {
                try {
                    await this.client.removeContainer(container.id, { force: true, removeVolumes: true });
                    containersRemoved += 1;
                } catch (error) {
                    this.diagnostics.warn(
                        `Failed to remove container ${container.id} for service "${projectName}": ${String(error)}`,
                        DockerServiceRuntimeResourcesAdapter.name,
                    );
                }
            }
        } catch (error) {
            this.diagnostics.warn(
                `Failed to list containers for service "${projectName}": ${String(error)}`,
                DockerServiceRuntimeResourcesAdapter.name,
            );
        }

        this.diagnostics.log(
            `Removed Docker containers for service "${projectName}": ${containersRemoved} container(s)`,
            DockerServiceRuntimeResourcesAdapter.name,
        );
    }

    public async removeNetworks(service: Service): Promise<void> {
        const projectName = serviceProjectNameUseCase(service);
        const selector: RuntimeSelector = { labels: selectOwnedResourcesUseCase(), project: projectName };

        let networksRemoved = 0;

        try {
            const networks = await this.client.listNetworks(selector);

            for (const network of networks) {
                try {
                    await this.client.removeNetwork(network.id);
                    networksRemoved += 1;
                } catch (error) {
                    this.diagnostics.warn(
                        `Failed to remove network ${network.id} for service "${projectName}": ${String(error)}`,
                        DockerServiceRuntimeResourcesAdapter.name,
                    );
                }
            }
        } catch (error) {
            this.diagnostics.warn(
                `Failed to list networks for service "${projectName}": ${String(error)}`,
                DockerServiceRuntimeResourcesAdapter.name,
            );
        }

        this.diagnostics.log(
            `Removed Docker networks for service "${projectName}": ${networksRemoved} network(s)`,
            DockerServiceRuntimeResourcesAdapter.name,
        );
    }

    public async removeImages(service: Service): Promise<void> {
        const projectName = serviceProjectNameUseCase(service);

        let imagesRemoved = 0;

        try {
            const labels = {
                ...selectOwnedResourcesUseCase(),
                [GITPAAS_PROJECT_LABEL]: projectName,
            };
            const builtImages = await this.client.listImages({ labels });

            for (const image of builtImages) {
                try {
                    await this.client.removeImage(image.id, { force: true });
                    imagesRemoved += 1;
                } catch (error) {
                    this.diagnostics.warn(
                        `Failed to remove image ${image.id} for service "${projectName}": ${String(error)}`,
                        DockerServiceRuntimeResourcesAdapter.name,
                    );
                }
            }
        } catch (error) {
            this.diagnostics.warn(
                `Failed to list images for service "${projectName}": ${String(error)}`,
                DockerServiceRuntimeResourcesAdapter.name,
            );
        }

        this.diagnostics.log(
            `Removed Docker images for service "${projectName}": ${imagesRemoved} image(s)`,
            DockerServiceRuntimeResourcesAdapter.name,
        );
    }
}
