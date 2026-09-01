import type { LoginDto, RefreshDto } from '@gitpaas/contracts';
import { UnauthorizedException } from '@nestjs/common';
import { Test } from '@nestjs/testing';

import { InvalidRefreshTokenError, UserInactiveError } from '../../../domain/errors/authentication.errors';
import { AuthTokens } from '../../../domain/models/auth-tokens.models';
import { AuthenticationService } from '../../services/authentication.service';
import { AuthenticationController } from '../authentication.controller';

import { getTelemetry, runWithTelemetry } from '@core/infrastructure/telemetry/telemetry.context';
import { User, UserRole } from '@features/users/domain/models/user.models';

const tokens: AuthTokens = { accessToken: 'access.jwt.token', refreshToken: 'refresh.jwt.token' };

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

describe('AuthenticationController', () => {
    let mockAuthenticationService: jest.Mocked<
        Pick<AuthenticationService, 'login' | 'refresh' | 'logout' | 'me'>
    >;
    let sut: AuthenticationController;

    beforeEach(async () => {
        jest.clearAllMocks();

        mockAuthenticationService = {
            login: jest.fn(),
            refresh: jest.fn(),
            logout: jest.fn(),
            me: jest.fn(),
        };

        const moduleRef = await Test.createTestingModule({
            controllers: [AuthenticationController],
            providers: [{ provide: AuthenticationService, useValue: mockAuthenticationService }],
        }).compile();

        sut = moduleRef.get(AuthenticationController);
    });

    it('login delegates the strategy-resolved user to the service and returns the token pair', async () => {
        mockAuthenticationService.login.mockResolvedValue(tokens);

        const result = await sut.login({} as LoginDto, user);

        expect(mockAuthenticationService.login).toHaveBeenCalledTimes(1);
        expect(mockAuthenticationService.login).toHaveBeenCalledWith(user);
        expect(result).toBe(tokens);
    });

    it('refresh delegates the raw refresh token to the service and returns the fresh pair', async () => {
        mockAuthenticationService.refresh.mockResolvedValue(tokens);
        const dto: RefreshDto = { refreshToken: 'refresh.jwt.token' };

        const result = await sut.refresh(dto);

        expect(mockAuthenticationService.refresh).toHaveBeenCalledTimes(1);
        expect(mockAuthenticationService.refresh).toHaveBeenCalledWith('refresh.jwt.token');
        expect(result).toBe(tokens);
    });

    it('refresh maps InvalidRefreshTokenError to a 401 UnauthorizedException', async () => {
        mockAuthenticationService.refresh.mockRejectedValue(new InvalidRefreshTokenError());

        await expect(sut.refresh({ refreshToken: 'bad' })).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('refresh keeps the InvalidRefreshTokenError message on the UnauthorizedException', async () => {
        mockAuthenticationService.refresh.mockRejectedValue(new InvalidRefreshTokenError());

        await expect(sut.refresh({ refreshToken: 'bad' })).rejects.toThrow('Invalid refresh token');
    });

    it('refresh maps UserInactiveError to a 401 UnauthorizedException', async () => {
        mockAuthenticationService.refresh.mockRejectedValue(new UserInactiveError());

        await expect(sut.refresh({ refreshToken: 'token' })).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('refresh keeps the UserInactiveError message on the UnauthorizedException', async () => {
        mockAuthenticationService.refresh.mockRejectedValue(new UserInactiveError());

        await expect(sut.refresh({ refreshToken: 'token' })).rejects.toThrow('User account is inactive');
    });

    it('refresh rethrows unexpected errors unchanged', async () => {
        const boom = new Error('database is down');
        mockAuthenticationService.refresh.mockRejectedValue(boom);

        await expect(sut.refresh({ refreshToken: 'token' })).rejects.toBe(boom);
    });

    it('logout delegates the raw refresh token to the service', async () => {
        mockAuthenticationService.logout.mockResolvedValue(undefined);
        const dto: RefreshDto = { refreshToken: 'refresh.jwt.token' };

        await sut.logout(dto);

        expect(mockAuthenticationService.logout).toHaveBeenCalledTimes(1);
        expect(mockAuthenticationService.logout).toHaveBeenCalledWith('refresh.jwt.token');
    });

    describe('telemetry event enrichment', () => {
        it('names the actor the local strategy resolved on a login', async () => {
            mockAuthenticationService.login.mockResolvedValue(tokens);

            const event = await runWithTelemetry({}, async () => {
                await sut.login({} as LoginDto, user);

                return getTelemetry();
            });

            expect(event).toEqual({ 'user.id': user.id, 'user.role': UserRole.Admin });
        });

        it('never publishes the e-mail or the password hash of the actor', async () => {
            mockAuthenticationService.login.mockResolvedValue(tokens);

            const event = await runWithTelemetry({}, async () => {
                await sut.login({} as LoginDto, user);

                return getTelemetry();
            });

            expect(JSON.stringify(event)).not.toContain(user.email);
            expect(JSON.stringify(event)).not.toContain(user.passwordHash);
        });

        it('names the actor of a login the service then refuses', async () => {
            const boom = new Error('database is down');
            mockAuthenticationService.login.mockRejectedValue(boom);

            const event = await runWithTelemetry({}, async () => {
                await expect(sut.login({} as LoginDto, user)).rejects.toBe(boom);

                return getTelemetry();
            });

            expect(event).toEqual({ 'user.id': user.id, 'user.role': UserRole.Admin });
        });

        it('adds nothing of its own on a refresh, which the service names', async () => {
            mockAuthenticationService.refresh.mockResolvedValue(tokens);

            const event = await runWithTelemetry({}, async () => {
                await sut.refresh({ refreshToken: 'refresh.jwt.token' });

                return getTelemetry();
            });

            expect(event).toEqual({});
        });

        it('adds nothing of its own on a logout, which the service names', async () => {
            mockAuthenticationService.logout.mockResolvedValue(undefined);

            const event = await runWithTelemetry({}, async () => {
                await sut.logout({ refreshToken: 'refresh.jwt.token' });

                return getTelemetry();
            });

            expect(event).toEqual({});
        });
    });

    it('me returns the public projection produced by the service', () => {
        const view: Omit<User, 'passwordHash'> = {
            id: user.id,
            email: user.email,
            displayName: user.displayName,
            totpSecret: user.totpSecret,
            totpEnabledAt: user.totpEnabledAt,
            role: user.role,
            isActive: user.isActive,
            createdAt: user.createdAt,
            updatedAt: user.updatedAt,
        };
        mockAuthenticationService.me.mockReturnValue(view);

        const result = sut.me(user);

        expect(mockAuthenticationService.me).toHaveBeenCalledTimes(1);
        expect(mockAuthenticationService.me).toHaveBeenCalledWith(user);
        expect(result).toEqual({
            id: user.id,
            email: user.email,
            displayName: user.displayName,
            role: user.role,
            totpEnabled: false,
            isActive: user.isActive,
            createdAt: user.createdAt.toISOString(),
            updatedAt: user.updatedAt.toISOString(),
        });
    });

    it('me never carries the hash of the password, even when the service hands the whole user', () => {
        mockAuthenticationService.me.mockReturnValue(user);

        const result = sut.me(user);

        expect(result).not.toHaveProperty('passwordHash');
        expect(result).not.toHaveProperty('totpSecret');
        expect(Object.values(result)).not.toContain('secret-hash');
    });

    it('me gives each date of the profile as a text of the ISO form', () => {
        mockAuthenticationService.me.mockReturnValue(user);

        const result = sut.me(user);

        expect(result.createdAt).toBe('2026-07-11T00:00:00.000Z');
        expect(result.updatedAt).toBe('2026-07-11T00:00:00.000Z');
        expect(Object.values<unknown>(result).some((value) => value instanceof Date)).toBe(false);
    });
});
