import { UserNotFoundError } from '../../domain/errors/users.errors';
import { User, UserRole } from '../../domain/models/user.models';
import { UsersRepository } from '../../domain/repositories/users.repository';
import { disableUserTotpUseCase } from '../disable-user-totp.use-case';

const USER_ID = '3f2504e0-4f89-41d3-9a0c-0305e82c3301';

const clearedUser: User = {
    id: USER_ID,
    email: 'user@example.com',
    passwordHash: 'stored-hash',
    displayName: 'Ada Lovelace',
    totpSecret: null,
    totpEnabledAt: null,
    role: UserRole.User,
    isActive: true,
    createdAt: new Date('2026-07-11T00:00:00.000Z'),
    updatedAt: new Date('2026-07-11T00:00:00.000Z'),
};

describe('disableUserTotpUseCase', () => {
    let mockUsersRepository: jest.Mocked<Pick<UsersRepository, 'updateTotp'>>;

    beforeEach(() => {
        jest.clearAllMocks();
        mockUsersRepository = { updateTotp: jest.fn().mockResolvedValue(clearedUser) };
    });

    it('clears both the stored secret and the date of the confirmation', async () => {
        await disableUserTotpUseCase(mockUsersRepository as unknown as UsersRepository, USER_ID);

        expect(mockUsersRepository.updateTotp).toHaveBeenCalledTimes(1);
        expect(mockUsersRepository.updateTotp).toHaveBeenCalledWith(USER_ID, null, null);
    });

    it('returns the updated user', async () => {
        const result = await disableUserTotpUseCase(mockUsersRepository as unknown as UsersRepository, USER_ID);

        expect(result).toBe(clearedUser);
    });

    it('throws a UserNotFoundError when no user carries the identifier', async () => {
        mockUsersRepository.updateTotp.mockResolvedValue(null);

        await expect(
            disableUserTotpUseCase(mockUsersRepository as unknown as UsersRepository, USER_ID),
        ).rejects.toBeInstanceOf(UserNotFoundError);
    });

    it('names the identifier in the message of the error', async () => {
        mockUsersRepository.updateTotp.mockResolvedValue(null);

        await expect(
            disableUserTotpUseCase(mockUsersRepository as unknown as UsersRepository, USER_ID),
        ).rejects.toThrow(`User "${USER_ID}" not found`);
    });

    it('propagates a failure of the repository unchanged', async () => {
        const boom = new Error('database is down');
        mockUsersRepository.updateTotp.mockRejectedValue(boom);

        await expect(disableUserTotpUseCase(mockUsersRepository as unknown as UsersRepository, USER_ID)).rejects.toBe(
            boom,
        );
    });
});
