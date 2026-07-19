import { Test } from '@nestjs/testing';

import { LoginDto } from '../../../domain/dtos/login.dto';
import { RefreshDto } from '../../../domain/dtos/refresh.dto';
import { AuthTokens } from '../../../domain/models/auth-tokens.model';
import { AuthenticatedUser, AuthenticationService } from '../../services/authentication.service';
import { AuthenticationController } from '../authentication.controller';

import { User, UserRole } from '@features/users/domain/models/user.model';

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

    it('logout delegates the raw refresh token to the service', async () => {
        mockAuthenticationService.logout.mockResolvedValue(undefined);
        const dto: RefreshDto = { refreshToken: 'refresh.jwt.token' };

        await sut.logout(dto);

        expect(mockAuthenticationService.logout).toHaveBeenCalledTimes(1);
        expect(mockAuthenticationService.logout).toHaveBeenCalledWith('refresh.jwt.token');
    });

    it('me returns the public projection produced by the service', () => {
        const view: AuthenticatedUser = {
            id: user.id,
            email: user.email,
            role: user.role,
            isActive: user.isActive,
            createdAt: user.createdAt,
            updatedAt: user.updatedAt,
        };
        mockAuthenticationService.me.mockReturnValue(view);

        const result = sut.me(user);

        expect(mockAuthenticationService.me).toHaveBeenCalledTimes(1);
        expect(mockAuthenticationService.me).toHaveBeenCalledWith(user);
        expect(result).toBe(view);
    });
});
