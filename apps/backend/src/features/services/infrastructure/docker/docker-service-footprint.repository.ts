import { Injectable } from '@nestjs/common';

import { Service } from '../../domain/models/service.model';
import { ServiceFootprintRepository } from '../../domain/repositories/service-footprint.repository';

import { DockerClient } from '@core/infrastructure/docker/docker.client';
import { DiagnosticLoggerService } from '@core/ui/services/diagnostic-logger.service';

/**
 * Compose label Docker stamps on every resource it groups under a service's stack.
 */
const COMPOSE_PROJECT_LABEL = 'com.docker.compose.project';

/**
 * Builds the Docker Compose project name for a service from its name, falling
 * back to its id. This value groups all of the service's Docker resources under
 * the `com.docker.compose.project` label.
 *
 * @param service Service to derive the project name from
 *
 * @returns Compose project name
 */
function composeProjectName(service: Service): string {
    const slug = service.name.toLowerCase().replace(/[^\da-z]+/g, '-').replace(/^-+|-+$/g, '');

    return slug || `service-${service.id}`;
}

/**
 * Docker service footprint repository.
 *
 * Removes a service's own Docker footprint from the VPS. All removals are
 * best-effort: each individual resource is removed inside its own try/catch so a
 * single failure — or an unreachable daemon — is logged and skipped rather than
 * aborting the teardown.
 */
@Injectable()
export class DockerServiceFootprintRepository implements ServiceFootprintRepository {
    constructor(
        private readonly client: DockerClient,
        private readonly diagnostics: DiagnosticLoggerService,
    ) {}

    /**
     * Tear down a service's Docker footprint: containers, compose networks and
     * locally built images, in that order. Shared pulled images are kept.
     *
     * @param service Service whose Docker footprint should be removed
     */
    public async remove(service: Service): Promise<void> {
        const projectName = composeProjectName(service);
        const docker = this.client.getClient();
        const filters = { label: [`${COMPOSE_PROJECT_LABEL}=${projectName}`] };

        let containersRemoved = 0;
        let networksRemoved = 0;
        let imagesRemoved = 0;

        // a. Containers
        try {
            const containers = await docker.listContainers({ all: true, filters });

            for (const container of containers) {
                try {
                    await docker.getContainer(container.Id).remove({ force: true, v: true });
                    containersRemoved += 1;
                } catch (error) {
                    this.diagnostics.warn(
                        `Failed to remove container ${container.Id} for service "${projectName}": ${String(error)}`,
                        DockerServiceFootprintRepository.name,
                    );
                }
            }
        } catch (error) {
            this.diagnostics.warn(
                `Failed to list containers for service "${projectName}": ${String(error)}`,
                DockerServiceFootprintRepository.name,
            );
        }

        // b. Networks
        try {
            const networks = await docker.listNetworks({ filters });

            for (const network of networks) {
                try {
                    await docker.getNetwork(network.Id).remove();
                    networksRemoved += 1;
                } catch (error) {
                    this.diagnostics.warn(
                        `Failed to remove network ${network.Id} for service "${projectName}": ${String(error)}`,
                        DockerServiceFootprintRepository.name,
                    );
                }
            }
        } catch (error) {
            this.diagnostics.warn(
                `Failed to list networks for service "${projectName}": ${String(error)}`,
                DockerServiceFootprintRepository.name,
            );
        }

        // c. Images — only those built locally for this project (`${projectName}_*`).
        try {
            const images = await docker.listImages();
            const builtPrefix = `${projectName}_`;
            const builtImages = images.filter(
                (image) => (image.RepoTags ?? []).some((tag) => tag.startsWith(builtPrefix)),
            );

            for (const image of builtImages) {
                try {
                    await docker.getImage(image.Id).remove({ force: true });
                    imagesRemoved += 1;
                } catch (error) {
                    this.diagnostics.warn(
                        `Failed to remove image ${image.Id} for service "${projectName}": ${String(error)}`,
                        DockerServiceFootprintRepository.name,
                    );
                }
            }
        } catch (error) {
            this.diagnostics.warn(
                `Failed to list images for service "${projectName}": ${String(error)}`,
                DockerServiceFootprintRepository.name,
            );
        }

        this.diagnostics.log(
            `Removed Docker footprint for service "${projectName}": `
                + `${containersRemoved} container(s), ${networksRemoved} network(s), ${imagesRemoved} image(s)`,
            DockerServiceFootprintRepository.name,
        );
    }
}
