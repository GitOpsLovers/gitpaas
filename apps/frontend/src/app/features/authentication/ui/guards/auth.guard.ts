import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { TokenStorageService } from '../../infrastructure/storage/token-storage.service';

/**
 * Route guard protecting the authenticated app shell.
 *
 * Allows navigation when a session is active; otherwise redirects to the
 * sign-in page.
 *
 * @returns True when authenticated, or a redirect `UrlTree` to `/signin`
 */
export const authGuard: CanActivateFn = () => {
    const tokenStorage = inject(TokenStorageService);
    const router = inject(Router);

    if (tokenStorage.accessToken() !== null) {
        return true;
    }

    return router.createUrlTree(['/signin']);
};

/**
 * Route guard for guest-only pages (e.g. sign-in).
 *
 * Allows navigation only when signed out; already-authenticated users are sent
 * to the dashboard.
 *
 * @returns True when signed out, or a redirect `UrlTree` to `/dashboard`
 */
export const guestGuard: CanActivateFn = () => {
    const tokenStorage = inject(TokenStorageService);
    const router = inject(Router);

    if (tokenStorage.accessToken() === null) {
        return true;
    }

    return router.createUrlTree(['/dashboard']);
};
