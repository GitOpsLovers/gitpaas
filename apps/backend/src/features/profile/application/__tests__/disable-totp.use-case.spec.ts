import { ProfileNotFoundError } from '../../domain/errors/profile.errors';
import { disableTotpUseCase } from '../disable-totp.use-case';

import { User, UserRole } from '@features/users/domain/models/user.models';
import { UsersRepository } from '@features/users/domain/repositories/users.repository';

const USER_ID = '3f2504e0-4f89-41d3-9a0c-0305e82c3301';

const clearedUser: User = {
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
};

describe('disableTotpUseCase', () => {
    let mockUsersRepository: jest.Mocked<Pick<UsersRepository, 'updateTotp'>>;

    beforeEach(() => {
        jest.clearAllMocks();
        mockUsersRepository = { updateTotp: jest.fn().mockResolvedValue(clearedUser) };
    });

    it('clears both the stored secret and the date of the confirmation', async () => {
        await disableTotpUseCase(mockUsersRepository as unknown as UsersRepository, USER_ID);

        expect(mockUsersRepository.updateTotp).toHaveBeenCalledTimes(1);
        expect(mockUsersRepository.updateTotp).toHaveBeenCalledWith(USER_ID, null, null);
    });

    it('returns the updated user', async () => {
        const result = await disableTotpUseCase(mockUsersRepository as unknown as UsersRepository, USER_ID);

        expect(result).toBe(clearedUser);
    });

    it('throws a ProfileNotFoundError when no user carries the identifier', async () => {
        mockUsersRepository.updateTotp.mockResolvedValue(null);

        await expect(
            disableTotpUseCase(mockUsersRepository as unknown as UsersRepository, USER_ID),
        ).rejects.toBeInstanceOf(ProfileNotFoundError);
    });

    it('propagates a failure of the repository unchanged', async () => {
        const boom = new Error('database is down');
        mockUsersRepository.updateTotp.mockRejectedValue(boom);

        await expect(disableTotpUseCase(mockUsersRepository as unknown as UsersRepository, USER_ID)).rejects.toBe(boom);
    });
});
