import { ExecutionContext } from '@nestjs/common';

import { currentUserFactory } from '../current-user.decorator';

import { User, UserRole } from '@features/users/domain/models/user.model';

// The `CurrentUser` decorator produced by `createParamDecorator` wraps this
// factory in a way NestJS keeps internal (unreachable in a unit test), which is
// exactly why the factory was extracted — the assertions target it directly.

const mockUser: User = {
    id: 'user-1',
    email: 'ada@example.com',
    passwordHash: 'hashed',
    role: UserRole.User,
    isActive: true,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-02T00:00:00.000Z'),
};

const contextFor = (
    request: unknown,
): { context: ExecutionContext; mockGetRequest: jest.Mock; mockSwitchToHttp: jest.Mock } => {
    const mockGetRequest = jest.fn().mockReturnValue(request);
    const mockSwitchToHttp = jest.fn().mockReturnValue({ getRequest: mockGetRequest });

    const context = {
        switchToHttp: mockSwitchToHttp,
    } as unknown as ExecutionContext;

    return { context, mockGetRequest, mockSwitchToHttp };
};

describe('currentUserFactory', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('returns the user attached to the request by the JWT strategy', () => {
        const { context, mockGetRequest, mockSwitchToHttp } = contextFor({ user: mockUser });

        const result = currentUserFactory(undefined, context);

        expect(result).toBe(mockUser);
        expect(mockSwitchToHttp).toHaveBeenCalledTimes(1);
        expect(mockGetRequest).toHaveBeenCalledTimes(1);
    });

    it('reads the user through switchToHttp().getRequest()', () => {
        const { context, mockGetRequest, mockSwitchToHttp } = contextFor({ user: mockUser });

        currentUserFactory(undefined, context);

        expect(mockSwitchToHttp).toHaveBeenCalledTimes(1);
        expect(mockGetRequest).toHaveBeenCalledTimes(1);
    });

    it('returns undefined when no user is attached to the request', () => {
        const { context } = contextFor({});

        const result = currentUserFactory(undefined, context);

        expect(result).toBeUndefined();
    });
});
