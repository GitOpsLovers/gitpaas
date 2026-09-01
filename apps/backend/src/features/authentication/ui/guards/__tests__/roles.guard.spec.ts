import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { ROLES_KEY } from '../../decorators/roles.decorator';
import { RolesGuard } from '../roles.guard';

import { User, UserRole } from '@features/users/domain/models/user.models';

const handler = (): void => undefined;

class Controller {
    public readonly marker = 'roles-guard-test';
}

/** Builds a user fixture, overriding only the fields under test. */
const userFixture = (overrides: Partial<User> = {}): User => ({
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
    ...overrides,
});

/** Builds an execution context whose HTTP request carries the given user. */
const contextFor = (user?: User): ExecutionContext =>
    ({
        getHandler: jest.fn().mockReturnValue(handler),
        getClass: jest.fn().mockReturnValue(Controller),
        switchToHttp: jest.fn().mockReturnValue({ getRequest: jest.fn().mockReturnValue({ user }) }),
    }) as unknown as ExecutionContext;

describe('RolesGuard', () => {
    let mockReflector: jest.Mocked<Pick<Reflector, 'getAllAndOverride'>>;
    let sut: RolesGuard;

    beforeEach(() => {
        jest.clearAllMocks();

        mockReflector = { getAllAndOverride: jest.fn() };
        sut = new RolesGuard(mockReflector as unknown as Reflector);
    });

    it('reads the declared roles off the handler and the class', () => {
        mockReflector.getAllAndOverride.mockReturnValue(undefined);
        const context = contextFor();

        sut.canActivate(context);

        expect(mockReflector.getAllAndOverride).toHaveBeenCalledTimes(1);
        expect(mockReflector.getAllAndOverride).toHaveBeenCalledWith(ROLES_KEY, [
            context.getHandler(),
            context.getClass(),
        ]);
    });

    it('lets a route that declares no role through', () => {
        mockReflector.getAllAndOverride.mockReturnValue(undefined);

        const result = sut.canActivate(contextFor());

        expect(result).toBe(true);
    });

    it('lets a route whose declared role list is empty through', () => {
        mockReflector.getAllAndOverride.mockReturnValue([]);

        const result = sut.canActivate(contextFor());

        expect(result).toBe(true);
    });

    it('never inspects the request of a route that declares no role', () => {
        mockReflector.getAllAndOverride.mockReturnValue(undefined);
        const context = contextFor();

        sut.canActivate(context);

        // eslint-disable-next-line @typescript-eslint/unbound-method
        expect(context.switchToHttp).not.toHaveBeenCalled();
    });

    it('lets a user whose role matches the declared role through', () => {
        mockReflector.getAllAndOverride.mockReturnValue([UserRole.Admin]);

        const result = sut.canActivate(contextFor(userFixture({ role: UserRole.Admin })));

        expect(result).toBe(true);
    });

    it('lets a user through when one of several declared roles matches', () => {
        mockReflector.getAllAndOverride.mockReturnValue([UserRole.Admin, UserRole.User]);

        const result = sut.canActivate(contextFor(userFixture({ role: UserRole.User })));

        expect(result).toBe(true);
    });

    it('throws a ForbiddenException when the role of the user does not match', () => {
        mockReflector.getAllAndOverride.mockReturnValue([UserRole.Admin]);

        expect(() => sut.canActivate(contextFor(userFixture({ role: UserRole.User })))).toThrow(ForbiddenException);
    });

    it('states in the message that the role does not allow the operation', () => {
        mockReflector.getAllAndOverride.mockReturnValue([UserRole.Admin]);

        expect(() => sut.canActivate(contextFor(userFixture({ role: UserRole.User })))).toThrow(
            'The role of the user does not allow this operation',
        );
    });

    it('throws a ForbiddenException when the request carries no user', () => {
        mockReflector.getAllAndOverride.mockReturnValue([UserRole.Admin]);

        expect(() => sut.canActivate(contextFor())).toThrow(ForbiddenException);
    });
});
