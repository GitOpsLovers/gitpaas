import {
    HttpErrorResponse, HttpEvent, HttpHandlerFn, HttpInterceptorFn, HttpRequest,
} from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, Observable, switchMap, throwError } from 'rxjs';

import { AuthenticationApiRepository } from '../../infrastructure/api/authentication-api.repository';
import { TokenStorageService } from '../../infrastructure/storage/token-storage.service';

import { environment } from '@environments/environment';
import { readErrorPayloadUseCase } from '@features/server/application/read-error-payload.use-case';

/**
 * Base URL of the backend API. Only requests to it carry the Bearer token.
 */
const API_BASE_URL = environment.apiBaseUrl;

/**
 * Code the envelope of the API carries when the access token is missing, expired or invalid.
 */
const UNAUTHENTICATED_CODE = 'UNAUTHENTICATED';

/**
 * URLs of the public authentication endpoints.
 */
const PUBLIC_AUTH_URLS: readonly string[] = [
    `${API_BASE_URL}/auth/login`,
    `${API_BASE_URL}/auth/refresh`,
    `${API_BASE_URL}/auth/logout`,
];

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
 * @param req Original (already authorised) request whose answer carried `UNAUTHENTICATED`
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
        router.navigate(['/signin']);

        return throwError(() => new HttpErrorResponse({ status: 401, url: req.url }));
    }

    return authRepository.refresh(refreshToken).pipe(
        switchMap((tokens) => {
            tokenStorage.update(tokens);

            return next(withBearer(req, tokens.accessToken));
        }),
        catchError((refreshError) => {
            tokenStorage.clear();
            router.navigate(['/signin']);

            return throwError(() => refreshError);
        }),
    );
}

/**
 * Functional HTTP interceptor handling authentication.
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
    const isPublicAuthEndpoint = PUBLIC_AUTH_URLS.includes(req.url);

    if (!isApiRequest || isPublicAuthEndpoint) {
        return next(req);
    }

    const accessToken = tokenStorage.accessToken();
    const authorisedReq = accessToken ? withBearer(req, accessToken) : req;

    return next(authorisedReq).pipe(
        catchError((error) => {
            if (readErrorPayloadUseCase(error).code === UNAUTHENTICATED_CODE) {
                return handleUnauthorised(authorisedReq, next, tokenStorage, authRepository, router);
            }

            return throwError(() => error);
        }),
    );
};
