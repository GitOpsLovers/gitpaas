import { UnauthorizedException } from '@nestjs/common';

import { validateUserUseCase } from '../../../application/validate-user.use-case';
import { InvalidCredentialsError, UserInactiveError } from '../../../domain/errors/authentication.errors';
import { User, UserRole } from '@features/users/domain/models/user.model';
import { UsersRepository } from '@features/users/domain/repositories/users.repository';
import { PasswordHasher } from '../../../domain/security/password-hasher';
import { UsersDatabaseRepository } from '@features/users/infrastructure/database/users-db.repository';
import { Argon2PasswordHasher } from '../../security/argon2-password-hasher';
import { LocalStrategy } from '../local.strategy';

jest.mock('../../../application/validate-user.use-case');

const validateUserUseCaseMock = validateUserUseCase as jest.MockedFunction<typeof validateUserUseCase>;

const user: User = {
    id: '3f2504e0-4f89-41d3-9a0c-0305e82c3301',
    email: 'admin@example.com',
    passwordHash: 'hash',
    role: UserRole.Admin,
    isActive: true,
    createdAt: new Date('2026-07-11T00:00:00.000Z'),
    updatedAt: new Date('2026-07-11T00:00:00.000Z'),
};

describe('LocalStrategy', () => {
    let usersRepository: jest.Mocked<UsersRepository>;
    let passwordHasher: jest.Mocked<PasswordHasher>;
    let strategy: LocalStrategy;

    beforeEach(() => {
        jest.clearAllMocks();
        usersRepository = {
            findByEmail: jest.fn(),
            findById: jest.fn(),
            create: jest.fn(),
        };
        passwordHasher = { hash: jest.fn(), verify: jest.fn() };
        strategy = new LocalStrategy(
            usersRepository as unknown as UsersDatabaseRepository,
            passwordHasher as unknown as Argon2PasswordHasher,
        );
    });

    it('validates the credentials via the use case and returns the resolved user', async () => {
        validateUserUseCaseMock.mockResolvedValue(user);

        const result = await strategy.validate('admin@example.com', 'plain');

        expect(validateUserUseCaseMock).toHaveBeenCalledWith(usersRepository, passwordHasher, 'admin@example.com', 'plain');
        expect(result).toBe(user);
    });

    it('maps InvalidCredentialsError to a 401 UnauthorizedException', async () => {
        validateUserUseCaseMock.mockRejectedValue(new InvalidCredentialsError());

        await expect(strategy.validate('admin@example.com', 'wrong')).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('maps UserInactiveError to a 401 UnauthorizedException', async () => {
        validateUserUseCaseMock.mockRejectedValue(new UserInactiveError());

        await expect(strategy.validate('admin@example.com', 'plain')).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('rethrows unexpected errors unchanged', async () => {
        const boom = new Error('database is down');
        validateUserUseCaseMock.mockRejectedValue(boom);

        await expect(strategy.validate('admin@example.com', 'plain')).rejects.toBe(boom);
    });
});
