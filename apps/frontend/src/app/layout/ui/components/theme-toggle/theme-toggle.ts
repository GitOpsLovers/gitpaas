import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';

import { ThemeService } from '@layout/ui/services/theme.service';

/**
 * Round button that toggles between light and dark theme.
 */
@Component({
    selector: 'app-theme-toggle-button',
    templateUrl: './theme-toggle.html',
    imports: [CommonModule],
})
export class ThemeToggleButtonComponent {
    readonly #themeService = inject(ThemeService);

    public readonly theme$ = this.#themeService.theme$;

    public toggleTheme(): void {
        this.#themeService.toggleTheme();
    }
}
