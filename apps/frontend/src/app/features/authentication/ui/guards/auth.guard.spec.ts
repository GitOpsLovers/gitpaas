import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import {
    ActivatedRouteSnapshot, Router, RouterStateSnapshot, UrlTree,
} from '@angular/router';

import { TokenStorageService } from '../../infrastructure/storage/token-storage.service';
import { authGuard, guestGuard } from './auth.guard';

describe('auth guards', () => {
    let accessToken: ReturnType<typeof signal<string | null>>;
    let signinUrlTree: UrlTree;
    let dashboardUrlTree: UrlTree;
    let router: { createUrlTree: ReturnType<typeof vi.fn> };

    const route = {} as ActivatedRouteSnapshot;
    const state = {} as RouterStateSnapshot;

    const run = (guard: typeof authGuard): boolean | UrlTree =>
        TestBed.runInInjectionContext(() => guard(route, state)) as boolean | UrlTree;

    beforeEach(() => {
        accessToken = signal<string | null>(null);
        signinUrlTree = new UrlTree();
        dashboardUrlTree = new UrlTree();
        router = {
            createUrlTree: vi.fn((commands: string[]) =>
                (commands[0] === '/signin' ? signinUrlTree : dashboardUrlTree)),
        };

        TestBed.configureTestingModule({
            providers: [
                { provide: TokenStorageService, useValue: { accessToken } },
                { provide: Router, useValue: router },
            ],
        });
    });

    describe('authGuard', () => {
        it('allows navigation when a session is active', () => {
            accessToken.set('access-1');

            expect(run(authGuard)).toBe(true);
            expect(router.createUrlTree).not.toHaveBeenCalled();
        });

        it('redirects to /signin when signed out', () => {
            accessToken.set(null);

            expect(run(authGuard)).toBe(signinUrlTree);
            expect(router.createUrlTree).toHaveBeenCalledWith(['/signin']);
        });
    });

    describe('guestGuard', () => {
        it('allows navigation when signed out', () => {
            accessToken.set(null);

            expect(run(guestGuard)).toBe(true);
            expect(router.createUrlTree).not.toHaveBeenCalled();
        });

        it('redirects to /dashboard when already authenticated', () => {
            accessToken.set('access-1');

            expect(run(guestGuard)).toBe(dashboardUrlTree);
            expect(router.createUrlTree).toHaveBeenCalledWith(['/dashboard']);
        });
    });
});
