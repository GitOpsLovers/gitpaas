import { InvalidCredentialsError, UserInactiveError } from '../../domain/errors/authentication.errors';
import { validateJwtUserUseCase } from '../validate-jwt-user.use-case';

import { User, UserRole } from '@features/users/domain/models/user.model';
import { UsersRepository } from '@features/users/domain/repositories/users.repository';

const user: User = {
    id: '3f2504e0-4f89-41d3-9a0c-0305e82c3301',
    email: 'admin@example.com',
    passwordHash: 'stored-hash',
    role: UserRole.Admin,
    isActive: true,
    createdAt: new Date('2026-07-11T00:00:00.000Z'),
    updatedAt: new Date('2026-07-11T00:00:00.000Z'),
};

describe('validateJwtUserUseCase', () => {
    let mockUsersRepository: jest.Mocked<Pick<UsersRepository, 'findById'>>;

    beforeEach(() => {
        jest.clearAllMocks();
        mockUsersRepository = {
            findById: jest.fn(),
        };
    });

    it('returns the user referenced by the token subject when it exists and is active', async () => {
        mockUsersRepository.findById.mockResolvedValue(user);

        const result = await validateJwtUserUseCase(mockUsersRepository as unknown as UsersRepository, user.id);

        expect(mockUsersRepository.findById).toHaveBeenCalledWith(user.id);
        expect(result).toBe(user);
    });

    it('throws InvalidCredentialsError when the user no longer exists', async () => {
        mockUsersRepository.findById.mockResolvedValue(null);

        await expect(
            validateJwtUserUseCase(mockUsersRepository as unknown as UsersRepository, 'missing'),
        ).rejects.toBeInstanceOf(InvalidCredentialsError);
    });

    it('throws UserInactiveError when the account is deactivated', async () => {
        mockUsersRepository.findById.mockResolvedValue({ ...user, isActive: false });

        await expect(
            validateJwtUserUseCase(mockUsersRepository as unknown as UsersRepository, user.id),
        ).rejects.toBeInstanceOf(UserInactiveError);
    });
});
