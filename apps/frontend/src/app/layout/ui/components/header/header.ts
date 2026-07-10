import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { RouterModule } from '@angular/router';

import { ThemeToggleButtonComponent } from '@layout/ui/components/theme-toggle/theme-toggle';
import { SidebarService } from '@layout/ui/services/sidebar.service';

/**
 * Top application bar: sidebar toggler, theme toggle and user avatar.
 */
@Component({
    selector: 'app-header',
    templateUrl: './header.html',
    imports: [CommonModule, RouterModule, ThemeToggleButtonComponent],
})
export class HeaderComponent {
    readonly #sidebarService = inject(SidebarService);

    public handleToggle(): void {
        if (window.innerWidth >= 1280) {
            this.#sidebarService.toggleExpanded();
        } else {
            this.#sidebarService.toggleMobileOpen();
        }
    }
}
