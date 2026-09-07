import { Component, computed, inject, input } from '@angular/core';
import { Router } from '@angular/router';
import { LucideContainer } from '@lucide/angular';

import { DockerContainersComponent } from '../docker-containers/docker-containers.component';
import { DockerImagesComponent } from '../docker-images/docker-images.component';
import { DockerNetworksComponent } from '../docker-networks/docker-networks.component';
import { DockerVolumesComponent } from '../docker-volumes/docker-volumes.component';

import { BreadcrumbComponent, BreadcrumbItem } from '@layout/ui/components/breadcrumb/breadcrumb.component';
import { TabsComponent } from '@shared/components/tabs/tabs.component';

/**
 * The four resources of the host the section shows, one for each tab.
 */
type DockerTab = 'containers' | 'images' | 'volumes' | 'networks';

@Component({
    selector: 'app-docker-overview',
    templateUrl: './docker-overview.component.html',
    imports: [
        BreadcrumbComponent,
        DockerContainersComponent,
        DockerImagesComponent,
        DockerNetworksComponent,
        DockerVolumesComponent,
        TabsComponent,
    ],
})

/**
 * Serves the four tabs of the section of Docker, one for each resource of the host.
 */
export class DockerOverviewComponent {
    protected readonly icon = LucideContainer;

    private readonly router = inject(Router);

    public readonly tab = input.required<string>();

    protected readonly breadcrumb: BreadcrumbItem[] = [{ label: 'Docker' }];

    /**
     * Defines the tabs available in the section of Docker.
     */
    protected readonly tabs: Array<{ id: DockerTab; label: string }> = [
        { id: 'containers', label: 'Containers' },
        { id: 'images', label: 'Images' },
        { id: 'volumes', label: 'Volumes' },
        { id: 'networks', label: 'Networks' },
    ];

    /**
     * Tab the route names, and the tab of the containers when the route names an unknown one.
     */
    protected readonly activeTab = computed<DockerTab>(() => {
        const tab = this.tab();

        return this.tabs.some((entry) => entry.id === tab) ? (tab as DockerTab) : 'containers';
    });

    /**
     * Navigates to a tab's subpath.
     *
     * @param tab Tab to activate
     */
    protected changeTab(tab: DockerTab): void {
        this.router.navigate(['/docker', tab]);
    }
}
