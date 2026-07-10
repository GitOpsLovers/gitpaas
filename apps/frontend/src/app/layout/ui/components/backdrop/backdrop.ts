import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';

import { SidebarService } from '@layout/ui/services/sidebar.service';

/**
 * Dimmed overlay shown behind the mobile sidebar drawer; closes it on click.
 */
@Component({
    selector: 'app-backdrop',
    templateUrl: './backdrop.html',
    imports: [CommonModule],
})
export class BackdropComponent {
    readonly #sidebarService = inject(SidebarService);

    public readonly isMobileOpen$ = this.#sidebarService.isMobileOpen$;

    public closeSidebar(): void {
        this.#sidebarService.setMobileOpen(false);
    }
}
