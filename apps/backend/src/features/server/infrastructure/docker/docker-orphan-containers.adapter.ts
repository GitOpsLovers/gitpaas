import { Inject, Injectable } from '@nestjs/common';

import { OrphanRemovalResult } from '../../domain/models/orphan-removal-result.models';
import { OrphanContainers } from '../../domain/ports/orphan-containers.port';

import { selectOwnedResourcesUseCase } from '@core/application/select-owned-resources.use-case';
import { GITPAAS_CONTROL_PLANE_PROJECTS } from '@core/domain/constants/gitpaas-labels.constants';
import type { RuntimeContainerSummary } from '@core/domain/models/container-runtime.models';
import type { ContainerRuntime } from '@core/domain/ports/container-runtime.port';
import { DockerContainerRuntimeAdapter } from '@core/infrastructure/docker/docker-container-runtime.adapter';
import { DiagnosticLoggerService } from '@core/ui/services/diagnostic-logger.service';

/**
 * Docker orphan containers adapter
 */
@Injectable()
export class DockerOrphanContainersAdapter implements OrphanContainers {
    constructor(
        @Inject(DockerContainerRuntimeAdapter)
        private readonly client: ContainerRuntime,
        private readonly diagnostics: DiagnosticLoggerService,
    ) {}

    /**
     * Force-removes GitPaaS-managed containers whose project isn't in the known
     * set. Only containers carrying the GitPaaS ownership marker *and* belonging
     * to some project are considered, so the control plane, system/DinD
     * containers and unrelated third-party stacks are never touched. As a
     * belt-and-braces guard, the GitPaaS control-plane projects are skipped
     * whatever their labels.
     *
     * @param knownProjects Compose project names of the services that still exist
     *
     * @returns Number of orphaned containers removed and their friendly names
     */
    public async removeOrphaned(knownProjects: string[]): Promise<OrphanRemovalResult> {
        const known = new Set(knownProjects);

        const candidates = await this.client.listContainers({ labels: selectOwnedResourcesUseCase(), project: null }, true);

        const names: string[] = [];

        for (const container of candidates) {
            const [project] = container.projects;

            if (known.has(project) || this.isControlPlane(container)) {
                continue;
            }

            const name = this.friendlyName(container);

            try {
                await this.client.removeContainer(container.id, { force: true, removeVolumes: true });
                names.push(name);
            } catch {
                this.diagnostics.warn(
                    `Failed to remove orphaned container "${name}" (${container.id})`,
                    OrphanContainersDockerAdapter.name,
                );
            }
        }

        this.diagnostics.log(
            `Removed ${names.length} orphaned container(s) from the server`,
            OrphanContainersDockerAdapter.name,
        );

        return { removed: names.length, names };
    }

    /**
     * Tells whether a container belongs to the GitPaaS control-plane stack itself.
     * Every project the runtime attributes it to is checked, so a mislabelled
     * control-plane container is still protected.
     *
     * @param container Container summary returned by the runtime
     *
     * @returns True when the container is part of the GitPaaS control plane
     */
    private isControlPlane(container: RuntimeContainerSummary): boolean {
        return container.projects.some((project) => GITPAAS_CONTROL_PLANE_PROJECTS.includes(project));
    }

    /**
     * Derives a friendly name for a container: the first of its names with the
     * leading slash stripped, falling back to the short id.
     *
     * @param container Container summary returned by the runtime
     *
     * @returns Human-readable container name
     */
    private friendlyName(container: RuntimeContainerSummary): string {
        const [first] = container.names;

        if (first) {
            return first.replace(/^\//, '');
        }

        return container.id.slice(0, 12);
    }
}
