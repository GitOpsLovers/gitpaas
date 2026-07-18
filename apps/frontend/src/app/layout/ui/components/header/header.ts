import { CommonModule } from '@angular/common';
import {
    Component, ElementRef, HostListener, inject, signal,
} from '@angular/core';
import { RouterModule } from '@angular/router';
import { LucideLogOut } from '@lucide/angular';

import { SidebarService } from '../../services/sidebar.service';
import { ThemeToggleButtonComponent } from '../theme-toggle/theme-toggle';

import { AuthService } from '@features/authentication/ui/services/auth.service';

@Component({
    selector: 'app-header',
    templateUrl: './header.html',
    imports: [CommonModule, RouterModule, ThemeToggleButtonComponent, LucideLogOut],
})

/**
 * Header component
 */
export class HeaderComponent {
    private readonly sidebarService = inject(SidebarService);

    private readonly authService = inject(AuthService);

    private readonly elementRef = inject(ElementRef);

    protected readonly isUserMenuOpen = signal(false);

    public handleToggle(): void {
        if (window.innerWidth >= 1280) {
            this.sidebarService.toggleExpanded();
        } else {
            this.sidebarService.toggleMobileOpen();
        }
    }

    protected toggleUserMenu(): void {
        this.isUserMenuOpen.update((open) => !open);
    }

    protected logout(): void {
        this.isUserMenuOpen.set(false);
        this.authService.logout();
    }

    @HostListener('document:click', ['$event'])
    protected onDocumentClick(event: MouseEvent): void {
        if (this.isUserMenuOpen() && !this.elementRef.nativeElement.contains(event.target)) {
            this.isUserMenuOpen.set(false);
        }
    }

    @HostListener('document:keydown.escape')
    protected onEscape(): void {
        this.isUserMenuOpen.set(false);
    }
}
