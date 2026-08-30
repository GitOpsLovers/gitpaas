import { Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { RouterModule } from '@angular/router';
import { LucideRocket } from '@lucide/angular';
import { combineLatest, lastValueFrom, map } from 'rxjs';

import { SidebarService } from '../../services/sidebar.service';

import { AuthService } from '@features/authentication/ui/services/auth.service';
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

    private readonly auth = inject(AuthService);

    private readonly sidebarService = inject(SidebarService);

    private readonly updateResource = this.repository.updateStatus(() => this.isAdmin());

    /**
     * Whether the user may read the versions of the installation.
     */
    protected readonly isAdmin = computed(() => this.auth.currentUser()?.role === 'admin');

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
        () => this.isAdmin() && this.isOpen() && this.update().installedVersion !== null,
    );

    constructor() {
        this.loadCurrentUser();
    }

    /**
     * Loads the user of the session, so that the block knows its role.
     */
    private async loadCurrentUser(): Promise<void> {
        if (this.auth.currentUser()) {
            return;
        }

        try {
            await lastValueFrom(this.auth.loadCurrentUser());
        } catch {
            // The role stays unknown, and the block of the version stays hidden.
        }
    }
}
