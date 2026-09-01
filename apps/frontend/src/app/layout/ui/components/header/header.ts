import { CommonModule } from '@angular/common';
import {
    Component, computed, ElementRef, HostListener, inject, signal,
} from '@angular/core';
import { RouterModule } from '@angular/router';
import { LucideLogOut, LucideUserRound } from '@lucide/angular';

import { SidebarService } from '../../services/sidebar.service';
import { ThemeToggleButtonComponent } from '../theme-toggle/theme-toggle';

import { AuthService } from '@features/authentication/ui/services/auth.service';
import { buildAccountInitialsUseCase } from '@features/profile/application/build-account-initials.use-case';

/**
 * Name the header shows while it knows no session, and when the account carries no display name.
 */
const UNNAMED = 'Account';

@Component({
    selector: 'app-header',
    templateUrl: './header.html',
    imports: [CommonModule, RouterModule, ThemeToggleButtonComponent, LucideLogOut, LucideUserRound],
})

/**
 * Header component
 */
export class HeaderComponent {
    private readonly sidebarService = inject(SidebarService);

    private readonly authService = inject(AuthService);

    private readonly elementRef = inject(ElementRef);

    protected readonly isUserMenuOpen = signal(false);

    /**
     * User of the session, once the shell has read it.
     */
    protected readonly currentUser = this.authService.currentUser;

    /**
     * Letters of the avatar, from the display name, or from the email address.
     */
    protected readonly initials = computed(() => {
        const user = this.currentUser();

        return user === null ? '' : buildAccountInitialsUseCase(user.displayName, user.email);
    });

    /**
     * Name shown beside the avatar, and a stand-in when the account carries none.
     */
    protected readonly name = computed(() => this.currentUser()?.displayName ?? UNNAMED);

    /**
     * Email address of the session, and nothing while the shell knows no session.
     */
    protected readonly email = computed(() => this.currentUser()?.email ?? null);

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

    protected closeUserMenu(): void {
        this.isUserMenuOpen.set(false);
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
