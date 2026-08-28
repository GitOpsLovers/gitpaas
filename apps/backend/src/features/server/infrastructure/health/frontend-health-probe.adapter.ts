import { Inject, Injectable } from '@nestjs/common';

import { StackContainerHealthProbeAdapter } from './stack-container-health-probe.adapter';

import type { ContainerRuntime } from '@core/domain/ports/container-runtime.port';
import { DockerContainerRuntimeAdapter } from '@core/infrastructure/docker/docker-container-runtime.adapter';

/**
 * Health probe of the frontend container of the GitPaaS stack.
 */
@Injectable()
export class FrontendHealthProbeAdapter extends StackContainerHealthProbeAdapter {
    public readonly name = 'frontend';

    protected readonly containerName = 'gitpaas-frontend';

    constructor(@Inject(DockerContainerRuntimeAdapter) client: ContainerRuntime) {
        super(client);
    }
}
