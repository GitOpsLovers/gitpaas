import { ContainerRuntimeInfo } from '@core/domain/models/container-runtime.models';
import { ContainerRuntime } from '@core/domain/ports/container-runtime.port';

/**
 * Use case for reading the server's container runtime information.
 *
 * @param runtime Container runtime port
 *
 * @returns Daemon information reported by the container runtime
 */
export function getServerStatusUseCase(runtime: ContainerRuntime): Promise<ContainerRuntimeInfo> {
    return runtime.info();
}
