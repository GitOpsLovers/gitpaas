import { Component, computed, effect, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';

import { ProjectsApiRepository } from '../../../infrastructure/api/projects-api.repository';

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

    public readonly namespaceId = input.required<string>();

    public readonly id = input.required<string>();

    private readonly project = this.repository.projectById(() => this.id());

    protected readonly breadcrumb = computed<BreadcrumbItem[]>(() => [
        { label: 'Namespaces', link: '/namespaces' },
        { label: 'Projects', link: ['/namespaces', this.namespaceId(), 'projects'] },
        { label: this.project.value()?.name ?? 'Project' },
    ]);

    constructor() {
        effect(() => {
            this.repository.namespaceId.set(this.namespaceId());
        });
    }
}
