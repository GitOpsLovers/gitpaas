import { Component, inject } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { RouterOutlet } from '@angular/router';

import { ThemeService } from '@layout/ui/services/theme.service';
import { ToastComponent } from '@shared/components/toast/toast.component';

@Component({
    selector: 'app-root',
    imports: [RouterOutlet, ToastComponent],
    template: '<router-outlet /><app-toast />',
})
export class App {
    readonly #titleService = inject(Title);

    // Injected so the persisted theme is applied at startup.
    readonly #theme = inject(ThemeService);

    constructor() {
        this.#titleService.setTitle('GitPaaS');
    }
}
