import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { TokenStorageService } from '../../infrastructure/storage/token-storage.service';

/**
 * Route guard protecting the authenticated app shell.
 *
 * @param _route Route being activated
 * @param state State of the router, which carries the asked address
 *
 * @returns True when authenticated, or a redirect `UrlTree` to `/signin`
 */
export const authGuard: CanActivateFn = (_route, state) => {
    const tokenStorage = inject(TokenStorageService);
    const router = inject(Router);

    if (tokenStorage.accessToken() !== null) {
        return true;
    }

    return router.createUrlTree(['/signin'], { queryParams: { returnUrl: state.url } });
};

/**
 * Route guard for guest-only pages (e.g. sign-in).
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
