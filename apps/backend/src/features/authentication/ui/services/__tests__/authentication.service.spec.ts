import { Test } from '@nestjs/testing';

import { loginUseCase } from '../../../application/login.use-case';
import { logoutUseCase } from '../../../application/logout.use-case';
import { refreshUseCase } from '../../../application/refresh.use-case';
import { InvalidRefreshTokenError, UserInactiveError } from '../../../domain/errors/authentication.errors';
import { AuthTokens } from '../../../domain/models/auth-tokens.models';
import type { RefreshTokenPayload } from '../../../domain/models/token-payloads.models';
import { DatabaseRefreshTokensRepository } from '../../../infrastructure/database/db-refresh-tokens.repository';
import { JwtTokenServiceAdapter } from '../../../infrastructure/security/jwt-token-service.adapter';
import { AuthenticationService } from '../authentication.service';

import type { TelemetryEvent } from '@core/domain/models/telemetry.models';
import { getTelemetry, runWithTelemetry } from '@core/infrastructure/telemetry/telemetry.context';
import { User, UserRole } from '@features/users/domain/models/user.models';
import { DatabaseUsersRepository } from '@features/users/infrastructure/database/db-users.repository';

jest.mock('../../../application/login.use-case');
jest.mock('../../../application/logout.use-case');
jest.mock('../../../application/refresh.use-case');

const mockLoginUseCase = loginUseCase as jest.MockedFunction<typeof loginUseCase>;
const mockLogoutUseCase = logoutUseCase as jest.MockedFunction<typeof logoutUseCase>;
const mockRefreshUseCase = refreshUseCase as jest.MockedFunction<typeof refreshUseCase>;

const tokens: AuthTokens = { accessToken: 'access.jwt.token', refreshToken: 'refresh.jwt.token' };

const refreshPayload: RefreshTokenPayload = {
    sub: '3f2504e0-4f89-41d3-9a0c-0305e82c3301',
    jti: 'a0c9c2ee-6b0d-4a6f-9b1a-1f1d3a2c4e5f',
};

const user: User = {
    id: '3f2504e0-4f89-41d3-9a0c-0305e82c3301',
    email: 'admin@example.com',
    passwordHash: 'secret-hash',
    displayName: null,
    totpSecret: null,
    totpEnabledAt: null,
    role: UserRole.Admin,
    isActive: true,
    createdAt: new Date('2026-07-11T00:00:00.000Z'),
    updatedAt: new Date('2026-07-11T00:00:00.000Z'),
};

describe('AuthenticationService', () => {
    let mockUsersRepository: jest.Mocked<DatabaseUsersRepository>;
    let mockRefreshTokensRepository: jest.Mocked<DatabaseRefreshTokensRepository>;
    // The service verifies the presented token itself, to name the actor of the event.
    let mockTokenService: jest.Mocked<Pick<JwtTokenServiceAdapter, 'verifyRefreshToken'>>;
    let sut: AuthenticationService;

    beforeEach(async () => {
        jest.clearAllMocks();
        mockUsersRepository = {} as jest.Mocked<DatabaseUsersRepository>;
        mockRefreshTokensRepository = {} as jest.Mocked<DatabaseRefreshTokensRepository>;
        mockTokenService = { verifyRefreshToken: jest.fn().mockReturnValue(refreshPayload) };

        const moduleRef = await Test.createTestingModule({
            providers: [
                AuthenticationService,
                { provide: DatabaseUsersRepository, useValue: mockUsersRepository },
                { provide: DatabaseRefreshTokensRepository, useValue: mockRefreshTokensRepository },
                { provide: JwtTokenServiceAdapter, useValue: mockTokenService },
            ],
        }).compile();

        sut = moduleRef.get(AuthenticationService);
    });

    describe('login', () => {
        it('delegates to the login use case and returns the token pair', async () => {
            mockLoginUseCase.mockResolvedValue(tokens);

            const result = await sut.login(user);

            expect(mockLoginUseCase).toHaveBeenCalledTimes(1);
            expect(mockLoginUseCase).toHaveBeenCalledWith(mockRefreshTokensRepository, mockTokenService, user);
            expect(result).toBe(tokens);
        });
    });

    describe('refresh', () => {
        it('delegates to the refresh use case and returns the fresh token pair', async () => {
            mockRefreshUseCase.mockResolvedValue(tokens);

            const result = await sut.refresh('refresh.jwt.token');

            expect(mockRefreshUseCase).toHaveBeenCalledTimes(1);
            expect(mockRefreshUseCase).toHaveBeenCalledWith(
                mockUsersRepository,
                mockRefreshTokensRepository,
                mockTokenService,
                'refresh.jwt.token',
            );
            expect(result).toBe(tokens);
        });

        it('propagates an InvalidRefreshTokenError raised by the use case unchanged', async () => {
            const error = new InvalidRefreshTokenError();
            mockRefreshUseCase.mockRejectedValue(error);

            await expect(sut.refresh('bad')).rejects.toBe(error);
        });

        it('propagates a UserInactiveError raised by the use case unchanged', async () => {
            const error = new UserInactiveError();
            mockRefreshUseCase.mockRejectedValue(error);

            await expect(sut.refresh('token')).rejects.toBe(error);
        });

        it('rethrows unexpected errors unchanged', async () => {
            const boom = new Error('database is down');
            mockRefreshUseCase.mockRejectedValue(boom);

            await expect(sut.refresh('token')).rejects.toBe(boom);
        });
    });

    describe('logout', () => {
        it('delegates to the logout use case', async () => {
            mockLogoutUseCase.mockResolvedValue(undefined);

            await sut.logout('refresh.jwt.token');

            expect(mockLogoutUseCase).toHaveBeenCalledTimes(1);
            expect(mockLogoutUseCase).toHaveBeenCalledWith(mockRefreshTokensRepository, mockTokenService, 'refresh.jwt.token');
        });
    });

    describe('telemetry event enrichment', () => {
        /** Runs a unit of work in a fresh telemetry scope and returns the accumulated event. */
        const eventOf = async (work: () => Promise<void>): Promise<Partial<TelemetryEvent> | undefined> =>
            runWithTelemetry({}, async () => {
                await work();

                return getTelemetry();
            });

        it('marks a successful login as authenticated', async () => {
            mockLoginUseCase.mockResolvedValue(tokens);

            const event = await eventOf(async () => {
                await sut.login(user);
            });

            expect(event).toEqual({
                'auth.outcome': 'authenticated',
            });
        });

        it('never publishes the e-mail or the password hash of the actor', async () => {
            mockLoginUseCase.mockResolvedValue(tokens);

            const event = await eventOf(async () => {
                await sut.login(user);
            });

            expect(JSON.stringify(event)).not.toContain(user.email);
            expect(JSON.stringify(event)).not.toContain(user.passwordHash);
        });

        it('names the subject of the token a successful refresh rotated', async () => {
            mockRefreshUseCase.mockResolvedValue(tokens);

            const event = await eventOf(async () => {
                await sut.refresh('refresh.jwt.token');
            });

            expect(mockTokenService.verifyRefreshToken).toHaveBeenCalledWith('refresh.jwt.token');
            expect(event).toEqual({ 'user.id': refreshPayload.sub, 'auth.outcome': 'authenticated' });
        });

        it('marks a refused refresh as rejected, keeping the named subject', async () => {
            mockRefreshUseCase.mockRejectedValue(new InvalidRefreshTokenError());

            const event = await eventOf(async () => {
                await expect(sut.refresh('refresh.jwt.token')).rejects.toBeInstanceOf(
                    InvalidRefreshTokenError,
                );
            });

            expect(event).toEqual({ 'user.id': refreshPayload.sub, 'auth.outcome': 'rejected' });
        });

        it('names no actor when the refresh token cannot be verified', async () => {
            mockTokenService.verifyRefreshToken.mockImplementation(() => {
                throw new Error('jwt malformed');
            });
            mockRefreshUseCase.mockRejectedValue(new InvalidRefreshTokenError());

            const event = await eventOf(async () => {
                await expect(sut.refresh('tampered')).rejects.toBeInstanceOf(InvalidRefreshTokenError);
            });

            expect(event).toEqual({ 'auth.outcome': 'rejected' });
        });

        it('names the subject of the token a logout revoked', async () => {
            mockLogoutUseCase.mockResolvedValue(undefined);

            const event = await eventOf(async () => {
                await sut.logout('refresh.jwt.token');
            });

            expect(event).toEqual({ 'user.id': refreshPayload.sub, 'auth.outcome': 'authenticated' });
        });

        it('marks a logout presenting an unverifiable token as rejected', async () => {
            mockTokenService.verifyRefreshToken.mockImplementation(() => {
                throw new Error('jwt expired');
            });
            mockLogoutUseCase.mockResolvedValue(undefined);

            const event = await eventOf(async () => {
                await sut.logout('expired');
            });

            expect(event).toEqual({ 'auth.outcome': 'rejected' });
        });

        it('still revokes the token of a logout that named no actor', async () => {
            mockTokenService.verifyRefreshToken.mockImplementation(() => {
                throw new Error('jwt expired');
            });
            mockLogoutUseCase.mockResolvedValue(undefined);

            await sut.logout('expired');

            expect(mockLogoutUseCase).toHaveBeenCalledTimes(1);
        });

        it('adds nothing for the projection of the authenticated user', () => {
            const event = runWithTelemetry({}, () => {
                sut.me(user);

                return getTelemetry();
            });

            expect(event).toEqual({});
        });
    });

    describe('me', () => {
        it('projects the user without its password hash', () => {
            const view = sut.me(user);

            expect(view).not.toHaveProperty('passwordHash');
            expect(view).toEqual({
                id: user.id,
                email: user.email,
                displayName: user.displayName,
                totpSecret: user.totpSecret,
                totpEnabledAt: user.totpEnabledAt,
                role: user.role,
                isActive: user.isActive,
                createdAt: user.createdAt,
                updatedAt: user.updatedAt,
            });
        });
    });
});
