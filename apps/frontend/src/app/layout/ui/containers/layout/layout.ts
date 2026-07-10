import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { RouterModule } from '@angular/router';

import { BackdropComponent } from '@layout/ui/components/backdrop/backdrop';
import { HeaderComponent } from '@layout/ui/components/header/header';
import { SidebarComponent } from '@layout/ui/components/sidebar/sidebar';
import { SidebarService } from '@layout/ui/services/sidebar.service';

/**
 * Application shell: fixed sidebar + mobile backdrop, sticky header and the
 * routed page content. The content column shifts to make room for the sidebar.
 */
@Component({
    selector: 'app-layout',
    templateUrl: './layout.html',
    imports: [CommonModule, RouterModule, HeaderComponent, SidebarComponent, BackdropComponent],
})
export class LayoutComponent {
    readonly #sidebarService = inject(SidebarService);

    public readonly isExpanded$ = this.#sidebarService.isExpanded$;
    public readonly isHovered$ = this.#sidebarService.isHovered$;
    public readonly isMobileOpen$ = this.#sidebarService.isMobileOpen$;
}
