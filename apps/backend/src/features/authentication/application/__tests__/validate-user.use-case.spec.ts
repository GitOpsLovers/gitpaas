import { InvalidCredentialsError, UserInactiveError } from '../../domain/errors/authentication.errors';
import { PasswordHasher } from '../../domain/security/password-hasher';
import { validateUserUseCase } from '../validate-user.use-case';

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

describe('validateUserUseCase', () => {
    let mockUsersRepository: jest.Mocked<Pick<UsersRepository, 'findByEmail'>>;
    let mockPasswordHasher: jest.Mocked<Pick<PasswordHasher, 'verify'>>;

    beforeEach(() => {
        jest.clearAllMocks();
        mockUsersRepository = {
            findByEmail: jest.fn(),
        };
        mockPasswordHasher = {
            verify: jest.fn(),
        };
    });

    it('returns the user when the email is known, the password matches and the account is active', async () => {
        mockUsersRepository.findByEmail.mockResolvedValue(user);
        mockPasswordHasher.verify.mockResolvedValue(true);

        const result = await validateUserUseCase(
            mockUsersRepository as unknown as UsersRepository,
            mockPasswordHasher as unknown as PasswordHasher,
            user.email,
            'plain',
        );

        expect(mockUsersRepository.findByEmail).toHaveBeenCalledWith(user.email);
        expect(mockPasswordHasher.verify).toHaveBeenCalledWith(user.passwordHash, 'plain');
        expect(result).toBe(user);
    });

    it('throws InvalidCredentialsError when the email is unknown and never checks the password', async () => {
        mockUsersRepository.findByEmail.mockResolvedValue(null);

        await expect(
            validateUserUseCase(
                mockUsersRepository as unknown as UsersRepository,
                mockPasswordHasher as unknown as PasswordHasher,
                'ghost@example.com',
                'plain',
            ),
        ).rejects.toBeInstanceOf(InvalidCredentialsError);
        expect(mockPasswordHasher.verify).not.toHaveBeenCalled();
    });

    it('throws InvalidCredentialsError when the password does not match', async () => {
        mockUsersRepository.findByEmail.mockResolvedValue(user);
        mockPasswordHasher.verify.mockResolvedValue(false);

        await expect(
            validateUserUseCase(
                mockUsersRepository as unknown as UsersRepository,
                mockPasswordHasher as unknown as PasswordHasher,
                user.email,
                'wrong',
            ),
        ).rejects.toBeInstanceOf(InvalidCredentialsError);
    });

    it('throws UserInactiveError when the account is deactivated even with valid credentials', async () => {
        mockUsersRepository.findByEmail.mockResolvedValue({ ...user, isActive: false });
        mockPasswordHasher.verify.mockResolvedValue(true);

        await expect(
            validateUserUseCase(
                mockUsersRepository as unknown as UsersRepository,
                mockPasswordHasher as unknown as PasswordHasher,
                user.email,
                'plain',
            ),
        ).rejects.toBeInstanceOf(UserInactiveError);
    });
});
