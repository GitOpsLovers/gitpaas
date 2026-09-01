import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { UnauthenticatedError } from '../../../domain/errors/authentication.errors';
import { IS_PUBLIC_KEY } from '../../decorators/public.decorator';
import { JwtAuthGuard } from '../jwt-auth.guard';

import { getTelemetry, runWithTelemetry } from '@core/infrastructure/telemetry/telemetry.context';
import { User, UserRole } from '@features/users/domain/models/user.models';

const handler = (): void => undefined;

class Controller {
    public readonly marker = 'jwt-auth-test';
}

const contextFor = (): ExecutionContext => {
    const mockGetHandler = jest.fn().mockReturnValue(handler);
    const mockGetClass = jest.fn().mockReturnValue(Controller);

    return {
        getHandler: mockGetHandler,
        getClass: mockGetClass,
    } as unknown as ExecutionContext;
};

describe('JwtAuthGuard', () => {
    let mockReflector: jest.Mocked<Pick<Reflector, 'getAllAndOverride'>>;
    let sut: JwtAuthGuard;
    let superCanActivate: jest.SpyInstance;

    beforeEach(() => {
        jest.clearAllMocks();

        mockReflector = { getAllAndOverride: jest.fn() };
        sut = new JwtAuthGuard(mockReflector as unknown as Reflector);
        // Stub the passport AuthGuard base so no real strategy runs.
        superCanActivate = jest
            .spyOn(Object.getPrototypeOf(JwtAuthGuard.prototype) as JwtAuthGuard, 'canActivate')
            .mockReturnValue(true);
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    it('lets a route flagged @Public() through without invoking the JWT strategy', () => {
        mockReflector.getAllAndOverride.mockReturnValue(true);
        const context = contextFor();

        const result = sut.canActivate(context);

        expect(mockReflector.getAllAndOverride).toHaveBeenCalledWith(IS_PUBLIC_KEY, [
            context.getHandler(),
            context.getClass(),
        ]);
        expect(result).toBe(true);
        expect(superCanActivate).not.toHaveBeenCalled();
    });

    it('enforces the JWT strategy for a non-public route', () => {
        mockReflector.getAllAndOverride.mockReturnValue(false);
        const context = contextFor();

        const result = sut.canActivate(context);

        expect(superCanActivate).toHaveBeenCalledWith(context);
        expect(result).toBe(true);
    });

    it('enforces the JWT strategy when the public flag is absent (undefined)', () => {
        mockReflector.getAllAndOverride.mockReturnValue(undefined);
        const context = contextFor();

        const result = sut.canActivate(context);

        expect(superCanActivate).toHaveBeenCalledWith(context);
        expect(result).toBe(true);
    });

    describe('telemetry event enrichment', () => {
        const user: User = {
            id: '2b1f8b4c-9c1a-4a2e-9d7f-6a5b4c3d2e1f',
            email: 'admin@gitpaas.dev',
            passwordHash: 'hash',
            displayName: null,
            totpSecret: null,
            totpEnabledAt: null,
            role: UserRole.Admin,
            isActive: true,
            createdAt: new Date('2026-01-01T00:00:00.000Z'),
            updatedAt: new Date('2026-01-01T00:00:00.000Z'),
        };

        let superHandleRequest: jest.SpyInstance;

        beforeEach(() => {
            superHandleRequest = jest
                .spyOn(Object.getPrototypeOf(JwtAuthGuard.prototype) as JwtAuthGuard, 'handleRequest')
                .mockImplementation((_error, handled) => handled);
        });

        it('marks a public route as anonymous', () => {
            mockReflector.getAllAndOverride.mockReturnValue(true);

            const event = runWithTelemetry({}, () => {
                // eslint-disable-next-line @typescript-eslint/no-floating-promises
                sut.canActivate(contextFor());

                return getTelemetry();
            });

            expect(event).toEqual({ 'auth.public_route': true, 'auth.outcome': 'anonymous' });
        });

        it('marks a guarded route as not public', () => {
            mockReflector.getAllAndOverride.mockReturnValue(false);

            const event = runWithTelemetry({}, () => {
                // eslint-disable-next-line @typescript-eslint/no-floating-promises
                sut.canActivate(contextFor());

                return getTelemetry();
            });

            expect(event).toEqual({ 'auth.public_route': false });
        });

        it('records the authenticated actor without its e-mail', () => {
            const event = runWithTelemetry({}, () => {
                sut.handleRequest(null, user, undefined, contextFor());

                return getTelemetry();
            });

            expect(event).toEqual({
                'auth.outcome': 'authenticated',
                'user.id': user.id,
                'user.role': UserRole.Admin,
            });
            expect(JSON.stringify(event)).not.toContain(user.email);
        });

        it('records a rejected request when no user was resolved', () => {
            const event = runWithTelemetry({}, () => {
                expect(() => sut.handleRequest(null, false, undefined, contextFor())).toThrow(
                    UnauthorizedException,
                );

                return getTelemetry();
            });

            expect(event).toEqual({ 'auth.outcome': 'rejected' });
        });

        it('rejects a request that resolved no user with the UNAUTHENTICATED cause', () => {
            expect.assertions(2);

            try {
                sut.handleRequest(null, false, undefined, contextFor());
            } catch (error) {
                // eslint-disable-next-line jest/no-conditional-expect
                expect(error).toBeInstanceOf(UnauthorizedException);
                // eslint-disable-next-line jest/no-conditional-expect
                expect((error as UnauthorizedException).cause).toEqual(new UnauthenticatedError());
            }
        });

        it('records a rejected request when the strategy failed', () => {
            const event = runWithTelemetry({}, () => {
                sut.handleRequest(new Error('expired'), user, undefined, contextFor());

                return getTelemetry();
            });

            expect(event).toEqual({ 'auth.outcome': 'rejected' });
        });

        it('delegates the outcome to the base guard', () => {
            sut.handleRequest(null, user, undefined, contextFor());

            expect(superHandleRequest).toHaveBeenCalledTimes(1);
        });
    });
});
