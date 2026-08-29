import { HttpResourceRef } from '@angular/common/http';
import { Component, computed, effect, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import type { Namespace } from '@gitpaas/contracts';

import { ProjectsApiRepository } from '../../../infrastructure/api/projects-api.repository';

import { NamespacesApiRepository } from '@features/namespaces/infrastructure/api/namespaces-api.repository';
import { ServicesListComponent } from '@features/services/ui/containers/services-list/services-list.component';
import { BreadcrumbComponent, BreadcrumbItem } from '@layout/ui/components/breadcrumb/breadcrumb.component';

@Component({
    selector: 'app-project-detail',
    templateUrl: './project-detail.component.html',
    providers: [ProjectsApiRepository],
    imports: [RouterLink, BreadcrumbComponent, ServicesListComponent],
})

/**
 * Project detail container component
 */
export class ProjectDetailComponent {
    private readonly repository = inject(ProjectsApiRepository);

    private readonly namespacesRepository = inject(NamespacesApiRepository);

    public readonly namespaceId = input.required<string>();

    public readonly id = input.required<string>();

    private readonly project = this.repository.projectById(() => this.id());

    private readonly namespace: HttpResourceRef<Namespace | undefined> = this.namespacesRepository.namespaceById(() => this.namespaceId());

    protected readonly breadcrumb = computed<BreadcrumbItem[]>(() => [
        { label: this.namespace.value()?.name ?? 'Namespace', link: ['/namespaces', this.namespaceId(), 'projects'] },
        { label: this.project.value()?.name ?? 'Project' },
    ]);

    constructor() {
        effect(() => {
            this.repository.namespaceId.set(this.namespaceId());
        });
    }
}
