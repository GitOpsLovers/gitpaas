import { Component, inject } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { RouterOutlet } from '@angular/router';

import { ThemeService } from '@layout/ui/services/theme.service';

@Component({
    selector: 'app-root',
    imports: [RouterOutlet],
    template: '<router-outlet />',
})
export class App {
    readonly #titleService = inject(Title);

    // Injected so the persisted theme is applied at startup.
    readonly #theme = inject(ThemeService);

    constructor() {
        this.#titleService.setTitle('Artifactory');
    }
}
