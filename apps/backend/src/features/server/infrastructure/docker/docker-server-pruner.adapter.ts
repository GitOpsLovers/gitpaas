import { Inject, Injectable } from '@nestjs/common';

import { PruneResult } from '../../domain/models/prune-result.models';
import { ServerPruner } from '../../domain/ports/server-pruner.port';

import { toPruneResult } from './docker-server-pruner.transformer';

import type { ContainerRuntime } from '@core/domain/ports/container-runtime.port';
import { DockerContainerRuntimeAdapter } from '@core/infrastructure/docker/docker-container-runtime.adapter';
import { getGitpaasLabels } from '@shared/application/get-gitpaas-labels.use-case';

/**
 * Docker server pruner adapter
 */
@Injectable()
export class DockerServerPrunerAdapter implements ServerPruner {
    constructor(@Inject(DockerContainerRuntimeAdapter) private readonly client: ContainerRuntime) {}

    public async pruneImages(): Promise<PruneResult> {
        const labels = getGitpaasLabels();
        const result = await this.client.pruneImages({ labels });

        return toPruneResult(result);
    }

    public async pruneVolumes(): Promise<PruneResult> {
        const labels = getGitpaasLabels();
        const result = await this.client.pruneVolumes({ labels });

        return toPruneResult(result);
    }

    public async pruneContainers(): Promise<PruneResult> {
        const labels = getGitpaasLabels();
        const result = await this.client.pruneContainers({ labels });

        return toPruneResult(result);
    }
}
