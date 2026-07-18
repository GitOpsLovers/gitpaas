import { InvalidCredentialsError, UserInactiveError } from '../../domain/errors/authentication.errors';
import { User, UserRole } from '@features/users/domain/models/user.model';
import { UsersRepository } from '@features/users/domain/repositories/users.repository';
import { PasswordHasher } from '../../domain/security/password-hasher';
import { validateUserUseCase } from '../validate-user.use-case';

const user: User = {
    id: '3f2504e0-4f89-41d3-9a0c-0305e82c3301',
    email: 'admin@example.com',
    passwordHash: 'stored-hash',
    role: UserRole.Admin,
    isActive: true,
    createdAt: new Date('2026-07-11T00:00:00.000Z'),
    updatedAt: new Date('2026-07-11T00:00:00.000Z'),
};

describe('validateUserUseCase', () => {
    let usersRepository: jest.Mocked<UsersRepository>;
    let passwordHasher: jest.Mocked<PasswordHasher>;

    beforeEach(() => {
        jest.clearAllMocks();
        usersRepository = {
            findByEmail: jest.fn(),
            findById: jest.fn(),
            create: jest.fn(),
        };
        passwordHasher = {
            hash: jest.fn(),
            verify: jest.fn(),
        };
    });

    it('returns the user when the email is known, the password matches and the account is active', async () => {
        usersRepository.findByEmail.mockResolvedValue(user);
        passwordHasher.verify.mockResolvedValue(true);

        const result = await validateUserUseCase(usersRepository, passwordHasher, user.email, 'plain');

        expect(usersRepository.findByEmail).toHaveBeenCalledWith(user.email);
        expect(passwordHasher.verify).toHaveBeenCalledWith(user.passwordHash, 'plain');
        expect(result).toBe(user);
    });

    it('throws InvalidCredentialsError when the email is unknown and never checks the password', async () => {
        usersRepository.findByEmail.mockResolvedValue(null);

        await expect(validateUserUseCase(usersRepository, passwordHasher, 'ghost@example.com', 'plain')).rejects.toBeInstanceOf(
            InvalidCredentialsError,
        );
        expect(passwordHasher.verify).not.toHaveBeenCalled();
    });

    it('throws InvalidCredentialsError when the password does not match', async () => {
        usersRepository.findByEmail.mockResolvedValue(user);
        passwordHasher.verify.mockResolvedValue(false);

        await expect(validateUserUseCase(usersRepository, passwordHasher, user.email, 'wrong')).rejects.toBeInstanceOf(
            InvalidCredentialsError,
        );
    });

    it('throws UserInactiveError when the account is deactivated even with valid credentials', async () => {
        usersRepository.findByEmail.mockResolvedValue({ ...user, isActive: false });
        passwordHasher.verify.mockResolvedValue(true);

        await expect(validateUserUseCase(usersRepository, passwordHasher, user.email, 'plain')).rejects.toBeInstanceOf(
            UserInactiveError,
        );
    });
});
