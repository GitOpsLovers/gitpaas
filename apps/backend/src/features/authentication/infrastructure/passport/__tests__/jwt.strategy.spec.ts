import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { validateJwtUserUseCase } from '../../../application/validate-jwt-user.use-case';
import { InvalidCredentialsError, UserInactiveError } from '../../../domain/errors/authentication.errors';
import { AccessTokenPayload } from '../../../domain/models/token.model';
import { User, UserRole } from '@features/users/domain/models/user.model';
import { UsersRepository } from '@features/users/domain/repositories/users.repository';
import { UsersDatabaseRepository } from '@features/users/infrastructure/database/users-db.repository';
import { JwtStrategy } from '../jwt.strategy';

jest.mock('../../../application/validate-jwt-user.use-case');

const validateJwtUserUseCaseMock = validateJwtUserUseCase as jest.MockedFunction<typeof validateJwtUserUseCase>;

const payload: AccessTokenPayload = {
    sub: '3f2504e0-4f89-41d3-9a0c-0305e82c3301',
    email: 'admin@example.com',
    role: UserRole.Admin,
};

const user: User = {
    id: payload.sub,
    email: payload.email,
    passwordHash: 'hash',
    role: UserRole.Admin,
    isActive: true,
    createdAt: new Date('2026-07-11T00:00:00.000Z'),
    updatedAt: new Date('2026-07-11T00:00:00.000Z'),
};

describe('JwtStrategy', () => {
    let usersRepository: jest.Mocked<UsersRepository>;
    let strategy: JwtStrategy;

    beforeEach(() => {
        jest.clearAllMocks();
        usersRepository = {
            findByEmail: jest.fn(),
            findById: jest.fn(),
            create: jest.fn(),
        };
        const config = { getOrThrow: jest.fn().mockReturnValue('access-secret') } as unknown as ConfigService;
        strategy = new JwtStrategy(usersRepository as unknown as UsersDatabaseRepository, config);
    });

    it('resolves the user via the use case for a verified token', async () => {
        validateJwtUserUseCaseMock.mockResolvedValue(user);

        const result = await strategy.validate(payload);

        expect(validateJwtUserUseCaseMock).toHaveBeenCalledWith(usersRepository, payload.sub);
        expect(result).toBe(user);
    });

    it('maps InvalidCredentialsError to a 401 UnauthorizedException', async () => {
        validateJwtUserUseCaseMock.mockRejectedValue(new InvalidCredentialsError());

        await expect(strategy.validate(payload)).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('maps UserInactiveError to a 401 UnauthorizedException', async () => {
        validateJwtUserUseCaseMock.mockRejectedValue(new UserInactiveError());

        await expect(strategy.validate(payload)).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('rethrows unexpected errors unchanged', async () => {
        const boom = new Error('database is down');
        validateJwtUserUseCaseMock.mockRejectedValue(boom);

        await expect(strategy.validate(payload)).rejects.toBe(boom);
    });
});
