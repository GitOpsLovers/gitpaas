import { Inject, Injectable } from '@nestjs/common';

import { StackContainerHealthProbeAdapter } from './stack-container-health-probe.adapter';

import type { ContainerRuntime } from '@core/domain/ports/container-runtime.port';
import { DockerContainerRuntimeAdapter } from '@core/infrastructure/docker/docker-container-runtime.adapter';

/**
 * Health probe of the backend container of the GitPaaS stack.
 */
@Injectable()
export class BackendHealthProbeAdapter extends StackContainerHealthProbeAdapter {
    public readonly name = 'backend';

    protected readonly containerName = 'gitpaas-backend';

    constructor(@Inject(DockerContainerRuntimeAdapter) client: ContainerRuntime) {
        super(client);
    }
}
