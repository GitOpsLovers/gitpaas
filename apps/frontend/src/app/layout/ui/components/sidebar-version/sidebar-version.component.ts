import { Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { RouterModule } from '@angular/router';
import { LucideRocket } from '@lucide/angular';
import { combineLatest, map } from 'rxjs';

import { SidebarService } from '../../services/sidebar.service';

import { mapPlatformUpdateUseCase } from '@features/server/application/map-platform-update.use-case';
import { ServerApiRepository } from '@features/server/infrastructure/api/server-api.repository';

@Component({
    selector: 'app-sidebar-version',
    templateUrl: './sidebar-version.component.html',
    providers: [ServerApiRepository],
    imports: [RouterModule, LucideRocket],
})

/**
 * Sidebar version component
 */
export class SidebarVersionComponent {
    private readonly repository = inject(ServerApiRepository);

    private readonly sidebarService = inject(SidebarService);

    private readonly updateResource = this.repository.updateStatus();

    /**
     * Whether the sidebar shows its labels, and so the version too.
     */
    protected readonly isOpen = toSignal(
        combineLatest([
            this.sidebarService.isExpanded$,
            this.sidebarService.isHovered$,
            this.sidebarService.isMobileOpen$,
        ]).pipe(map((states) => states.some(Boolean))),
        { initialValue: false },
    );

    /**
     * Versions of the installation, as the block of the sidebar shows them.
     */
    protected readonly update = computed(() => mapPlatformUpdateUseCase(
        this.updateResource.error() ? undefined : this.updateResource.value(),
    ));

    /**
     * Whether the block of the version has anything to show.
     */
    protected readonly show = computed(
        () => this.isOpen() && this.update().installedVersion !== null,
    );
}
