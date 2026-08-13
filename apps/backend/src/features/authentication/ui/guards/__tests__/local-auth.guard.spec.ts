import { ExecutionContext, UnauthorizedException } from '@nestjs/common';

import { LocalAuthGuard } from '../local-auth.guard';

import { getTelemetry, runWithTelemetry } from '@core/infrastructure/telemetry/telemetry.context';
import { User, UserRole } from '@features/users/domain/models/user.models';

const handler = (): void => undefined;

class Controller {
    public readonly marker = 'local-auth-test';
}

const contextFor = (): ExecutionContext => {
    const mockGetHandler = jest.fn().mockReturnValue(handler);
    const mockGetClass = jest.fn().mockReturnValue(Controller);

    return {
        getHandler: mockGetHandler,
        getClass: mockGetClass,
    } as unknown as ExecutionContext;
};

const user: User = {
    id: '3f2504e0-4f89-41d3-9a0c-0305e82c3301',
    email: 'admin@gitpaas.dev',
    passwordHash: 'secret-hash',
    role: UserRole.Admin,
    isActive: true,
    createdAt: new Date('2026-07-11T00:00:00.000Z'),
    updatedAt: new Date('2026-07-11T00:00:00.000Z'),
};

describe('LocalAuthGuard', () => {
    let sut: LocalAuthGuard;

    beforeEach(() => {
        jest.clearAllMocks();

        sut = new LocalAuthGuard();
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    it('is instantiable as a LocalAuthGuard', () => {
        expect(sut).toBeInstanceOf(LocalAuthGuard);
    });

    it('is a Passport AuthGuard exposing canActivate', () => {
        expect(typeof sut.canActivate).toBe('function');
    });

    it('inherits the Passport guard contract (handleRequest/logIn)', () => {
        expect(typeof sut.handleRequest).toBe('function');
        expect(typeof sut.logIn).toBe('function');
    });

    describe('handleRequest', () => {
        it('returns the user the strategy validated', () => {
            expect(sut.handleRequest(null, user, undefined, contextFor())).toBe(user);
        });

        it('rejects the request when the strategy resolved no user', () => {
            expect(() => sut.handleRequest(null, false, undefined, contextFor())).toThrow(
                UnauthorizedException,
            );
        });

        it('rethrows the error the strategy raised, unchanged', () => {
            const error = new Error('strategy exploded');

            expect(() => sut.handleRequest(error, false, undefined, contextFor())).toThrow(error);
        });

        it('delegates the outcome to the base Passport guard', () => {
            const superHandleRequest = jest
                .spyOn(Object.getPrototypeOf(LocalAuthGuard.prototype) as LocalAuthGuard, 'handleRequest')
                .mockReturnValue(user);

            sut.handleRequest(null, user, undefined, contextFor());

            expect(superHandleRequest).toHaveBeenCalledTimes(1);
            expect(superHandleRequest).toHaveBeenCalledWith(null, user, undefined, expect.anything(), undefined);
        });
    });

    describe('telemetry event enrichment', () => {
        it('records a rejected login when the credentials named no user', () => {
            const event = runWithTelemetry({ 'auth.outcome': 'anonymous' }, () => {
                expect(() => sut.handleRequest(null, false, undefined, contextFor())).toThrow(
                    UnauthorizedException,
                );

                return getTelemetry();
            });

            expect(event).toEqual({ 'auth.outcome': 'rejected' });
        });

        it('records a rejected login when the strategy failed', () => {
            const error = new Error('database is down');

            const event = runWithTelemetry({ 'auth.outcome': 'anonymous' }, () => {
                expect(() => sut.handleRequest(error, user, undefined, contextFor())).toThrow(error);

                return getTelemetry();
            });

            expect(event).toEqual({ 'auth.outcome': 'rejected' });
        });

        it('leaves the outcome to the route once the credentials were accepted', () => {
            const event = runWithTelemetry({ 'auth.outcome': 'anonymous' }, () => {
                sut.handleRequest(null, user, undefined, contextFor());

                return getTelemetry();
            });

            expect(event).toEqual({ 'auth.outcome': 'anonymous' });
        });

        it('does nothing outside a unit of work', () => {
            expect(() => sut.handleRequest(null, false, undefined, contextFor())).toThrow(
                UnauthorizedException,
            );
            expect(getTelemetry()).toBeUndefined();
        });
    });
});
