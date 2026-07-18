import { UnauthorizedException } from '@nestjs/common';
import { Test } from '@nestjs/testing';

import { loginUseCase } from '../../../application/login.use-case';
import { logoutUseCase } from '../../../application/logout.use-case';
import { refreshUseCase } from '../../../application/refresh.use-case';
import { InvalidRefreshTokenError, UserInactiveError } from '../../../domain/errors/authentication.errors';
import { AuthTokens } from '../../../domain/models/auth-tokens.model';
import { RefreshTokensDatabaseRepository } from '../../../infrastructure/database/refresh-tokens-db.repository';
import { JwtTokenService } from '../../../infrastructure/security/jwt-token.service';
import { AuthenticationService } from '../authentication.service';

import { User, UserRole } from '@features/users/domain/models/user.model';
import { UsersDatabaseRepository } from '@features/users/infrastructure/database/users-db.repository';

jest.mock('../../../application/login.use-case');
jest.mock('../../../application/logout.use-case');
jest.mock('../../../application/refresh.use-case');

const loginUseCaseMock = loginUseCase as jest.MockedFunction<typeof loginUseCase>;
const logoutUseCaseMock = logoutUseCase as jest.MockedFunction<typeof logoutUseCase>;
const refreshUseCaseMock = refreshUseCase as jest.MockedFunction<typeof refreshUseCase>;

const tokens: AuthTokens = { accessToken: 'access.jwt.token', refreshToken: 'refresh.jwt.token' };

const user: User = {
    id: '3f2504e0-4f89-41d3-9a0c-0305e82c3301',
    email: 'admin@example.com',
    passwordHash: 'secret-hash',
    role: UserRole.Admin,
    isActive: true,
    createdAt: new Date('2026-07-11T00:00:00.000Z'),
    updatedAt: new Date('2026-07-11T00:00:00.000Z'),
};

describe('AuthenticationService', () => {
    let usersRepository: jest.Mocked<UsersDatabaseRepository>;
    let refreshTokensRepository: jest.Mocked<RefreshTokensDatabaseRepository>;
    let tokenService: jest.Mocked<JwtTokenService>;
    let sut: AuthenticationService;

    beforeEach(async () => {
        jest.clearAllMocks();
        usersRepository = {} as jest.Mocked<UsersDatabaseRepository>;
        refreshTokensRepository = {} as jest.Mocked<RefreshTokensDatabaseRepository>;
        tokenService = {} as jest.Mocked<JwtTokenService>;

        const moduleRef = await Test.createTestingModule({
            providers: [
                AuthenticationService,
                { provide: UsersDatabaseRepository, useValue: usersRepository },
                { provide: RefreshTokensDatabaseRepository, useValue: refreshTokensRepository },
                { provide: JwtTokenService, useValue: tokenService },
            ],
        }).compile();

        sut = moduleRef.get(AuthenticationService);
    });

    describe('login', () => {
        it('delegates to the login use case and returns the token pair', async () => {
            loginUseCaseMock.mockResolvedValue(tokens);

            const result = await sut.login(user);

            expect(loginUseCaseMock).toHaveBeenCalledWith(refreshTokensRepository, tokenService, user);
            expect(result).toBe(tokens);
        });
    });

    describe('refresh', () => {
        it('delegates to the refresh use case and returns the fresh token pair', async () => {
            refreshUseCaseMock.mockResolvedValue(tokens);

            const result = await sut.refresh('refresh.jwt.token');

            expect(refreshUseCaseMock).toHaveBeenCalledWith(
                usersRepository,
                refreshTokensRepository,
                tokenService,
                'refresh.jwt.token',
            );
            expect(result).toBe(tokens);
        });

        it('maps InvalidRefreshTokenError to a 401 UnauthorizedException', async () => {
            refreshUseCaseMock.mockRejectedValue(new InvalidRefreshTokenError());

            await expect(sut.refresh('bad')).rejects.toBeInstanceOf(UnauthorizedException);
        });

        it('maps UserInactiveError to a 401 UnauthorizedException', async () => {
            refreshUseCaseMock.mockRejectedValue(new UserInactiveError());

            await expect(sut.refresh('token')).rejects.toBeInstanceOf(UnauthorizedException);
        });

        it('rethrows unexpected errors unchanged', async () => {
            const boom = new Error('database is down');
            refreshUseCaseMock.mockRejectedValue(boom);

            await expect(sut.refresh('token')).rejects.toBe(boom);
        });
    });

    describe('logout', () => {
        it('delegates to the logout use case', async () => {
            logoutUseCaseMock.mockResolvedValue(undefined);

            await sut.logout('refresh.jwt.token');

            expect(logoutUseCaseMock).toHaveBeenCalledWith(refreshTokensRepository, tokenService, 'refresh.jwt.token');
        });
    });

    describe('me', () => {
        it('projects the user without its password hash', () => {
            const view = sut.me(user);

            expect(view).not.toHaveProperty('passwordHash');
            expect(view).toEqual({
                id: user.id,
                email: user.email,
                role: user.role,
                isActive: user.isActive,
                createdAt: user.createdAt,
                updatedAt: user.updatedAt,
            });
        });
    });
});
