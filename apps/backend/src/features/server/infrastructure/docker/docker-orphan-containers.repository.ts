import { Injectable } from '@nestjs/common';

import { OrphanRemovalResult } from '../../domain/models/orphan-removal-result.model';
import { OrphanContainersRepository } from '../../domain/repositories/orphan-containers.repository';

import { DockerClient } from '@core/infrastructure/docker/docker.client';
import { DiagnosticLoggerService } from '@core/ui/services/diagnostic-logger.service';

/**
 * Compose label Docker stamps on every container it groups under a service's stack.
 */
const COMPOSE_PROJECT_LABEL = 'com.docker.compose.project';

/**
 * Docker orphan containers repository
 */
@Injectable()
export class DockerOrphanContainersRepository implements OrphanContainersRepository {
    constructor(
        private readonly client: DockerClient,
        private readonly diagnostics: DiagnosticLoggerService,
    ) {}

    /**
     * Force-removes GitPaaS containers whose compose project isn't in the
     * known set. Only containers carrying the compose project label are
     * considered, so system/DinD/non-GitPaaS containers are never touched.
     *
     * @param knownProjects Compose project names of the services that still exist
     *
     * @returns Number of orphaned containers removed and their friendly names
     */
    public async removeOrphaned(knownProjects: string[]): Promise<OrphanRemovalResult> {
        const known = new Set(knownProjects);

        const candidates = await this.client.getClient().listContainers({
            all: true,
            filters: { label: [COMPOSE_PROJECT_LABEL] },
        });

        const names: string[] = [];

        for (const container of candidates) {
            const project = container.Labels[COMPOSE_PROJECT_LABEL];

            if (known.has(project)) {
                continue;
            }

            const name = this.friendlyName(container);

            try {
                await this.client.getClient().getContainer(container.Id).remove({ force: true, v: true });
                names.push(name);
            } catch {
                this.diagnostics.warn(
                    `Failed to remove orphaned container "${name}" (${container.Id})`,
                    DockerOrphanContainersRepository.name,
                );
            }
        }

        this.diagnostics.log(
            `Removed ${names.length} orphaned container(s) from the VPS`,
            DockerOrphanContainersRepository.name,
        );

        return { removed: names.length, names };
    }

    /**
     * Derives a friendly name for a container: the first of its names with the
     * leading slash stripped, falling back to the short id.
     *
     * @param container Container info returned by the daemon
     *
     * @returns Human-readable container name
     */
    private friendlyName(container: { Id: string; Names: string[] }): string {
        const [first] = container.Names;

        if (first) {
            return first.replace(/^\//, '');
        }

        return container.Id.slice(0, 12);
    }
}
