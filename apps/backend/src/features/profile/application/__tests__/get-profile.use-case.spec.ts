import { ProfileNotFoundError } from '../../domain/errors/profile.errors';
import { getProfileUseCase } from '../get-profile.use-case';

import { User, UserRole } from '@features/users/domain/models/user.models';
import { UsersRepository } from '@features/users/domain/repositories/users.repository';

const USER_ID = '3f2504e0-4f89-41d3-9a0c-0305e82c3301';

/** Builds a domain user fixture, overriding only the fields under test. */
const domainUser = (overrides: Partial<User> = {}): User => ({
    id: USER_ID,
    email: 'admin@example.com',
    passwordHash: 'stored-hash',
    displayName: 'Ada Lovelace',
    totpSecret: null,
    totpEnabledAt: null,
    role: UserRole.Admin,
    isActive: true,
    createdAt: new Date('2026-07-11T00:00:00.000Z'),
    updatedAt: new Date('2026-07-11T00:00:00.000Z'),
    ...overrides,
});

describe('getProfileUseCase', () => {
    let mockUsersRepository: jest.Mocked<Pick<UsersRepository, 'findById'>>;

    beforeEach(() => {
        jest.clearAllMocks();
        mockUsersRepository = { findById: jest.fn() };
    });

    /** Runs the use case with the mocked repository. */
    const run = (): Promise<User> => getProfileUseCase(mockUsersRepository as unknown as UsersRepository, USER_ID);

    it('reads the stored user by the identifier of the token', async () => {
        mockUsersRepository.findById.mockResolvedValue(domainUser());

        await run();

        expect(mockUsersRepository.findById).toHaveBeenCalledTimes(1);
        expect(mockUsersRepository.findById).toHaveBeenCalledWith(USER_ID);
    });

    it('returns the stored user unchanged', async () => {
        const user = domainUser();

        mockUsersRepository.findById.mockResolvedValue(user);

        await expect(run()).resolves.toBe(user);
    });

    it('throws a ProfileNotFoundError when no user carries that identifier', async () => {
        mockUsersRepository.findById.mockResolvedValue(null);

        await expect(run()).rejects.toBeInstanceOf(ProfileNotFoundError);
    });

    it('propagates a failure of the repository unchanged', async () => {
        const error = new Error('database is down');

        mockUsersRepository.findById.mockRejectedValue(error);

        await expect(run()).rejects.toThrow(error);
    });
});
