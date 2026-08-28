import { Inject, Injectable } from '@nestjs/common';

import { StackContainerHealthProbeAdapter } from './stack-container-health-probe.adapter';

import type { ContainerRuntime } from '@core/domain/ports/container-runtime.port';
import { DockerContainerRuntimeAdapter } from '@core/infrastructure/docker/docker-container-runtime.adapter';

/**
 * Health probe of the proxy container of the GitPaaS stack.
 */
@Injectable()
export class ProxyHealthProbeAdapter extends StackContainerHealthProbeAdapter {
    public readonly name = 'proxy';

    protected readonly containerName = 'gitpaas-proxy';

    constructor(@Inject(DockerContainerRuntimeAdapter) client: ContainerRuntime) {
        super(client);
    }
}
