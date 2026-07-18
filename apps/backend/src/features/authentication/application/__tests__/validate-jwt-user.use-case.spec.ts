import { InvalidCredentialsError, UserInactiveError } from '../../domain/errors/authentication.errors';
import { User, UserRole } from '@features/users/domain/models/user.model';
import { UsersRepository } from '@features/users/domain/repositories/users.repository';
import { validateJwtUserUseCase } from '../validate-jwt-user.use-case';

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
    let usersRepository: jest.Mocked<UsersRepository>;

    beforeEach(() => {
        jest.clearAllMocks();
        usersRepository = {
            findByEmail: jest.fn(),
            findById: jest.fn(),
            create: jest.fn(),
        };
    });

    it('returns the user referenced by the token subject when it exists and is active', async () => {
        usersRepository.findById.mockResolvedValue(user);

        const result = await validateJwtUserUseCase(usersRepository, user.id);

        expect(usersRepository.findById).toHaveBeenCalledWith(user.id);
        expect(result).toBe(user);
    });

    it('throws InvalidCredentialsError when the user no longer exists', async () => {
        usersRepository.findById.mockResolvedValue(null);

        await expect(validateJwtUserUseCase(usersRepository, 'missing')).rejects.toBeInstanceOf(InvalidCredentialsError);
    });

    it('throws UserInactiveError when the account is deactivated', async () => {
        usersRepository.findById.mockResolvedValue({ ...user, isActive: false });

        await expect(validateJwtUserUseCase(usersRepository, user.id)).rejects.toBeInstanceOf(UserInactiveError);
    });
});
