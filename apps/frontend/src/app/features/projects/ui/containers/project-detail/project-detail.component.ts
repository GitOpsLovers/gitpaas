import { HttpResourceRef } from '@angular/common/http';
import { Component, computed, effect, inject, input } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import type { Namespace } from '@gitpaas/contracts';
import { LucideFolder } from '@lucide/angular';

import { ProjectsApiRepository } from '../../../infrastructure/api/projects-api.repository';

import { NamespacesApiRepository } from '@features/namespaces/infrastructure/api/namespaces-api.repository';
import { ProjectNetworksListComponent } from '@features/networks/ui/containers/project-networks-list/project-networks-list.component';
import { ServicesListComponent } from '@features/services/ui/containers/services-list/services-list.component';
import { BreadcrumbComponent, BreadcrumbItem } from '@layout/ui/components/breadcrumb/breadcrumb.component';
import { TabsComponent } from '@shared/components/tabs/tabs.component';

type ProjectTab = 'services' | 'networks';

@Component({
    selector: 'app-project-detail',
    templateUrl: './project-detail.component.html',
    providers: [ProjectsApiRepository],
    imports: [RouterLink, BreadcrumbComponent, ProjectNetworksListComponent, ServicesListComponent, TabsComponent],
})

/**
 * Project detail container component
 */
export class ProjectDetailComponent {
    protected readonly icon = LucideFolder;

    private readonly repository = inject(ProjectsApiRepository);

    private readonly namespacesRepository = inject(NamespacesApiRepository);

    private readonly router = inject(Router);

    public readonly namespaceId = input.required<string>();

    public readonly id = input.required<string>();

    public readonly tab = input.required<string>();

    private readonly project = this.repository.projectById(() => this.id());

    private readonly namespace: HttpResourceRef<Namespace | undefined> = this.namespacesRepository.namespaceById(() => this.namespaceId());

    /**
     * Defines the tabs available in the project detail view.
     */
    protected readonly tabs: Array<{ id: ProjectTab; label: string }> = [
        { id: 'services', label: 'Services' },
        { id: 'networks', label: 'Networks' },
    ];

    protected readonly activeTab = computed<ProjectTab>(() => {
        const tab = this.tab();

        return this.tabs.some((entry) => entry.id === tab) ? (tab as ProjectTab) : 'services';
    });

    protected readonly breadcrumb = computed<BreadcrumbItem[]>(() => [
        { label: this.namespace.value()?.name ?? 'Namespace', link: ['/namespaces', this.namespaceId(), 'projects'] },
        { label: this.project.value()?.name ?? 'Project' },
    ]);

    constructor() {
        effect(() => {
            this.repository.namespaceId.set(this.namespaceId());
        });
    }

    /**
     * Navigates to a tab's subpath.
     *
     * @param tab Tab to activate
     */
    protected changeTab(tab: ProjectTab): void {
        this.router.navigate(['/namespaces', this.namespaceId(), 'projects', this.id(), tab]);
    }
}
