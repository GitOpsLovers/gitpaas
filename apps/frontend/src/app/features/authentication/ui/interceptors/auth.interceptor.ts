import {
    HttpErrorResponse, HttpEvent, HttpHandlerFn, HttpInterceptorFn, HttpRequest,
} from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, Observable, switchMap, throwError } from 'rxjs';

import { AuthenticationApiRepository } from '../../infrastructure/api/authentication-api.repository';
import { TokenStorageService } from '../../infrastructure/storage/token-storage.service';

/**
 * Base URL of the backend API. Only requests to it carry the Bearer token.
 */
const API_BASE_URL = 'http://localhost:3000/api/v1';

/**
 * Prefix of the public authentication endpoints (login/refresh/logout), which
 * must never receive a Bearer header nor trigger a refresh-retry.
 */
const AUTH_ENDPOINT_PREFIX = `${API_BASE_URL}/auth/`;

/**
 * Clones a request adding the Bearer authorization header
 *
 * @param req Request to authorise
 * @param accessToken Access token to attach
 *
 * @returns The cloned, authorised request
 */
function withBearer(req: HttpRequest<unknown>, accessToken: string): HttpRequest<unknown> {
    return req.clone({ setHeaders: { Authorization: `Bearer ${accessToken}` } });
}

/**
 * Attempts a single token refresh and retries the original request on success
 *
 * @param req Original (already authorised) request that received the 401
 * @param next Next handler in the chain
 * @param tokenStorage Token storage service
 * @param authRepository Authentication API repository
 * @param router Router used to redirect on refresh failure
 *
 * @returns The retried response stream, or a propagated error
 */
function handleUnauthorised(
    req: HttpRequest<unknown>,
    next: HttpHandlerFn,
    tokenStorage: TokenStorageService,
    authRepository: AuthenticationApiRepository,
    router: Router,
): Observable<HttpEvent<unknown>> {
    const refreshToken = tokenStorage.refreshToken();

    if (!refreshToken) {
        tokenStorage.clear();
        void router.navigate(['/signin']);

        return throwError(() => new HttpErrorResponse({ status: 401, url: req.url }));
    }

    return authRepository.refresh(refreshToken).pipe(
        switchMap((tokens) => {
            tokenStorage.update(tokens);

            return next(withBearer(req, tokens.accessToken));
        }),
        catchError((refreshError) => {
            tokenStorage.clear();
            void router.navigate(['/signin']);

            return throwError(() => refreshError);
        }),
    );
}

/**
 * Functional HTTP interceptor handling authentication.
 *
 * Attaches `Authorization: Bearer <accessToken>` to API requests (except the
 * public auth endpoints). On a `401` for a protected request it attempts a
 * single token refresh and, on success, retries the original request with the
 * new token; on refresh failure it clears the session and redirects to sign-in.
 *
 * @param req Outgoing request
 * @param next Next handler in the chain
 *
 * @returns The (possibly authorised and/or retried) response stream
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
    const tokenStorage = inject(TokenStorageService);
    const authRepository = inject(AuthenticationApiRepository);
    const router = inject(Router);

    const isApiRequest = req.url.startsWith(API_BASE_URL);
    const isAuthEndpoint = req.url.startsWith(AUTH_ENDPOINT_PREFIX);

    // Auth endpoints and non-API traffic pass through untouched.
    if (!isApiRequest || isAuthEndpoint) {
        return next(req);
    }

    const accessToken = tokenStorage.accessToken();
    const authorisedReq = accessToken ? withBearer(req, accessToken) : req;

    return next(authorisedReq).pipe(
        catchError((error) => {
            if (error instanceof HttpErrorResponse && error.status === 401) {
                return handleUnauthorised(authorisedReq, next, tokenStorage, authRepository, router);
            }

            return throwError(() => error);
        }),
    );
};
