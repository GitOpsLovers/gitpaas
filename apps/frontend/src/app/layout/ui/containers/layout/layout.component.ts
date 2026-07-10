import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { RouterModule } from '@angular/router';

import { BackdropComponent } from '../../components/backdrop/backdrop';
import { HeaderComponent } from '../../components/header/header';
import { SidebarComponent } from '../../components/sidebar/sidebar.component';
import { SidebarService } from '../../services/sidebar.service';

@Component({
    selector: 'app-layout',
    templateUrl: './layout.component.html',
    imports: [CommonModule, RouterModule, HeaderComponent, SidebarComponent, BackdropComponent],
})

/**
 * Layout component
 */
export class LayoutComponent {
    readonly #sidebarService = inject(SidebarService);

    public readonly isExpanded$ = this.#sidebarService.isExpanded$;

    public readonly isHovered$ = this.#sidebarService.isHovered$;

    public readonly isMobileOpen$ = this.#sidebarService.isMobileOpen$;
}
