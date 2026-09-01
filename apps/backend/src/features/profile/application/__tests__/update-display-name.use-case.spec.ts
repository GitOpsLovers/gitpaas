import { ProfileNotFoundError } from '../../domain/errors/profile.errors';
import { updateDisplayNameUseCase } from '../update-display-name.use-case';

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

describe('updateDisplayNameUseCase', () => {
    let mockUsersRepository: jest.Mocked<Pick<UsersRepository, 'updateDisplayName'>>;

    beforeEach(() => {
        jest.clearAllMocks();
        mockUsersRepository = { updateDisplayName: jest.fn() };
    });

    /** Runs the use case with the mocked repository. */
    const run = (displayName: string | null): Promise<User> =>
        updateDisplayNameUseCase(mockUsersRepository as unknown as UsersRepository, USER_ID, displayName);

    it('writes the display name for the user of the token', async () => {
        mockUsersRepository.updateDisplayName.mockResolvedValue(domainUser({ displayName: 'Grace Hopper' }));

        await run('Grace Hopper');

        expect(mockUsersRepository.updateDisplayName).toHaveBeenCalledTimes(1);
        expect(mockUsersRepository.updateDisplayName).toHaveBeenCalledWith(USER_ID, 'Grace Hopper');
    });

    it('passes a null through, so the caller can clear the display name', async () => {
        mockUsersRepository.updateDisplayName.mockResolvedValue(domainUser({ displayName: null }));

        await run(null);

        expect(mockUsersRepository.updateDisplayName).toHaveBeenCalledWith(USER_ID, null);
    });

    it('returns the updated user unchanged', async () => {
        const user = domainUser({ displayName: 'Grace Hopper' });

        mockUsersRepository.updateDisplayName.mockResolvedValue(user);

        await expect(run('Grace Hopper')).resolves.toBe(user);
    });

    it('throws a ProfileNotFoundError when no user carries that identifier', async () => {
        mockUsersRepository.updateDisplayName.mockResolvedValue(null);

        await expect(run('Grace Hopper')).rejects.toBeInstanceOf(ProfileNotFoundError);
    });

    it('propagates a failure of the repository unchanged', async () => {
        const error = new Error('database is down');

        mockUsersRepository.updateDisplayName.mockRejectedValue(error);

        await expect(run('Grace Hopper')).rejects.toThrow(error);
    });
});
