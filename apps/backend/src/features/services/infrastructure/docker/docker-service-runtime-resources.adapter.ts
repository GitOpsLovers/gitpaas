import { Inject, Injectable } from '@nestjs/common';

import { Service } from '../../domain/models/service.models';
import { ServiceRuntimeResources } from '../../domain/ports/service-runtime-resources.port';

import type { RuntimeSelector } from '@core/domain/models/container-runtime.models';
import type { ContainerRuntime } from '@core/domain/ports/container-runtime.port';
import { DockerContainerRuntimeAdapter } from '@core/infrastructure/docker/docker-container-runtime.adapter';
import { PROXY_NETWORK } from '@features/domains/infrastructure/traefik/traefik-reverse-proxy.constants';
import {
    getVolumeDaemonKeyFromNameUseCase,
    GITPAAS_VOLUME_KEY_PREFIX,
} from '@features/volumes/application/get-volume-daemon-name.use-case';
import { getGitpaasLabels } from '@shared/application/get-gitpaas-labels.use-case';

/**
 * Docker service runtime resources adapter.
 */
@Injectable()
export class DockerServiceRuntimeResourcesAdapter implements ServiceRuntimeResources {
    constructor(
        @Inject(DockerContainerRuntimeAdapter)
        private readonly client: ContainerRuntime,
    ) {}

    public async removeRouting(service: Service): Promise<void> {
        const selector: RuntimeSelector = { labels: getGitpaasLabels(), service: service.id };

        try {
            const containers = await this.client.listContainers(selector, true);

            for (const container of containers) {
                try {
                    await this.client.disconnectNetwork(PROXY_NETWORK, container.id);
                } catch {
                    // Best-effort cleanup: a container that never joined the proxy is already unrouted.
                }
            }
        } catch {
            // Best-effort cleanup: the failed call is already counted in `deps.docker.errors`.
        }
    }

    public async removeContainers(service: Service): Promise<void> {
        const selector: RuntimeSelector = { labels: getGitpaasLabels(), service: service.id };

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
        const selector: RuntimeSelector = { labels: getGitpaasLabels(), service: service.id };

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

    public async removeVolumes(service: Service): Promise<void> {
        const selector: RuntimeSelector = { labels: getGitpaasLabels(), service: service.id };

        try {
            const volumes = await this.client.listVolumes(selector);

            for (const volume of volumes) {
                const key = getVolumeDaemonKeyFromNameUseCase(service, volume.name);

                // A volume the Compose file declares belongs to the user's recipe, so its data survives the service.
                if (!key.startsWith(GITPAAS_VOLUME_KEY_PREFIX)) {
                    continue;
                }

                try {
                    await this.client.removeVolume(volume.name);
                } catch {
                    // Best-effort cleanup: the failed call is already counted in `deps.docker.errors`.
                }
            }
        } catch {
            // Best-effort cleanup: the failed call is already counted in `deps.docker.errors`.
        }
    }

    public async removeImages(service: Service): Promise<void> {
        const selector: RuntimeSelector = { labels: getGitpaasLabels(), service: service.id };

        try {
            const builtImages = await this.client.listImages(selector);

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
