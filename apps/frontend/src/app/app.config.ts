import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { ApplicationConfig, inject, provideAppInitializer, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter, withComponentInputBinding, withInMemoryScrolling } from '@angular/router';

import { routes } from './app.routes';

import { authInterceptor } from '@features/authentication/ui/interceptors/auth.interceptor';
import { AuthService } from '@features/authentication/ui/services/auth.service';

export const appConfig: ApplicationConfig = {
    providers: [
        provideBrowserGlobalErrorListeners(),
        provideRouter(
            routes,
            withComponentInputBinding(),
            withInMemoryScrolling({ scrollPositionRestoration: 'top', anchorScrolling: 'enabled' }),
        ),
        provideHttpClient(withInterceptors([authInterceptor])),
        provideAppInitializer(() => inject(AuthService).restoreSession()),
    ],
};
