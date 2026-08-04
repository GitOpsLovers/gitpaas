import { Inject, Injectable } from '@nestjs/common';

import { Service } from '../../domain/models/service.models';
import { ServiceRuntimeResources } from '../../domain/ports/service-runtime-resources.port';

import { selectOwnedResourcesUseCase } from '@core/application/select-owned-resources.use-case';
import { serviceProjectNameUseCase } from '@core/application/service-project-name.use-case';
import { GITPAAS_PROJECT_LABEL } from '@core/domain/constants/gitpaas-labels.constants';
import type { LabelSelector, RuntimeSelector } from '@core/domain/models/container-runtime.models';
import type { ContainerRuntime } from '@core/domain/ports/container-runtime.port';
import { DockerContainerRuntimeAdapter } from '@core/infrastructure/docker/container-runtime-docker.adapter';
import { DiagnosticLoggerService } from '@core/ui/services/diagnostic-logger.service';

/**
 * Encodes the GitPaaS ownership policy narrowed to a single project: the
 * ownership marker built by `selectOwnedResourcesUseCase` plus the GitPaaS
 * project label. The marker is always kept, so a project-scoped selection can
 * never widen beyond GitPaaS-managed resources.
 *
 * @param projectName Compose project name to scope to
 *
 * @returns Selector matching the ownership marker and the GitPaaS project label
 */
function gitpaasProjectSelector(projectName: string): LabelSelector {
    return {
        ...selectOwnedResourcesUseCase(),
        [GITPAAS_PROJECT_LABEL]: projectName,
    };
}

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

    public async remove(service: Service): Promise<void> {
        const projectName = serviceProjectNameUseCase(service);
        const selector: RuntimeSelector = { labels: selectOwnedResourcesUseCase(), project: projectName };

        let containersRemoved = 0;
        let networksRemoved = 0;
        let imagesRemoved = 0;

        // a. Containers
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

        // b. Networks
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

        // c. Images — only those GitPaaS built locally for this project. They are
        // identified by the GitPaaS labels stamped at build time, so shared pulled
        // images and unrelated host images are never matched.
        try {
            const builtImages = await this.client.listImages({ labels: gitpaasProjectSelector(projectName) });

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
            `Removed Docker resources for service "${projectName}": `
                + `${containersRemoved} container(s), ${networksRemoved} network(s), ${imagesRemoved} image(s)`,
            DockerServiceRuntimeResourcesAdapter.name,
        );
    }
}
