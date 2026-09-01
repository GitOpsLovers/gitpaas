import { Test } from '@nestjs/testing';

import { changeEmailUseCase } from '../../../application/change-email.use-case';
import { changePasswordUseCase } from '../../../application/change-password.use-case';
import { getProfileUseCase } from '../../../application/get-profile.use-case';
import { updateDisplayNameUseCase } from '../../../application/update-display-name.use-case';
import { ProfileNotFoundError } from '../../../domain/errors/profile.errors';
import { ProfileService } from '../profile.service';

import { AuthTokens } from '@features/authentication/domain/models/auth-tokens.models';
import { DatabaseRefreshTokensRepository } from '@features/authentication/infrastructure/database/db-refresh-tokens.repository';
import { JwtTokenServiceAdapter } from '@features/authentication/infrastructure/security/jwt-token-service.adapter';
import { User, UserRole } from '@features/users/domain/models/user.models';
import { DatabaseUsersRepository } from '@features/users/infrastructure/database/db-users.repository';
import { Argon2PasswordHasherAdapter } from '@shared/infrastructure/security/argon2-password-hasher.adapter';

jest.mock('../../../application/get-profile.use-case');
jest.mock('../../../application/update-display-name.use-case');
jest.mock('../../../application/change-email.use-case');
jest.mock('../../../application/change-password.use-case');

const mockGetProfileUseCase = getProfileUseCase as jest.MockedFunction<typeof getProfileUseCase>;
const mockUpdateDisplayNameUseCase = updateDisplayNameUseCase as jest.MockedFunction<typeof updateDisplayNameUseCase>;
const mockChangeEmailUseCase = changeEmailUseCase as jest.MockedFunction<typeof changeEmailUseCase>;
const mockChangePasswordUseCase = changePasswordUseCase as jest.MockedFunction<typeof changePasswordUseCase>;

const USER_ID = '3f2504e0-4f89-41d3-9a0c-0305e82c3301';

const tokens: AuthTokens = { accessToken: 'access.jwt.token', refreshToken: 'refresh.jwt.token' };

const user: User = {
    id: USER_ID,
    email: 'admin@example.com',
    passwordHash: 'stored-hash',
    displayName: 'Ada Lovelace',
    totpSecret: null,
    totpEnabledAt: null,
    role: UserRole.Admin,
    isActive: true,
    createdAt: new Date('2026-07-11T00:00:00.000Z'),
    updatedAt: new Date('2026-07-11T00:00:00.000Z'),
};

describe('ProfileService', () => {
    let mockUsersRepository: jest.Mocked<DatabaseUsersRepository>;
    let mockRefreshTokensRepository: jest.Mocked<DatabaseRefreshTokensRepository>;
    let mockTokenService: jest.Mocked<JwtTokenServiceAdapter>;
    let mockPasswordHasher: jest.Mocked<Argon2PasswordHasherAdapter>;
    let sut: ProfileService;

    beforeEach(async () => {
        jest.clearAllMocks();

        mockUsersRepository = {} as jest.Mocked<DatabaseUsersRepository>;
        mockRefreshTokensRepository = {} as jest.Mocked<DatabaseRefreshTokensRepository>;
        mockTokenService = {} as jest.Mocked<JwtTokenServiceAdapter>;
        mockPasswordHasher = {} as jest.Mocked<Argon2PasswordHasherAdapter>;

        const moduleRef = await Test.createTestingModule({
            providers: [
                ProfileService,
                { provide: DatabaseUsersRepository, useValue: mockUsersRepository },
                { provide: DatabaseRefreshTokensRepository, useValue: mockRefreshTokensRepository },
                { provide: JwtTokenServiceAdapter, useValue: mockTokenService },
                { provide: Argon2PasswordHasherAdapter, useValue: mockPasswordHasher },
            ],
        }).compile();

        sut = moduleRef.get(ProfileService);
    });

    describe('getProfile', () => {
        it('delegates to the use case with the injected repository and the identifier', async () => {
            mockGetProfileUseCase.mockResolvedValue(user);

            await sut.getProfile(USER_ID);

            expect(mockGetProfileUseCase).toHaveBeenCalledTimes(1);
            expect(mockGetProfileUseCase).toHaveBeenCalledWith(mockUsersRepository, USER_ID);
        });

        it('returns the user the use case gives back', async () => {
            mockGetProfileUseCase.mockResolvedValue(user);

            await expect(sut.getProfile(USER_ID)).resolves.toBe(user);
        });

        it('propagates the error of the use case unchanged', async () => {
            const error = new ProfileNotFoundError();

            mockGetProfileUseCase.mockRejectedValue(error);

            await expect(sut.getProfile(USER_ID)).rejects.toThrow(error);
        });
    });

    describe('updateDisplayName', () => {
        it('delegates to the use case with the display name', async () => {
            mockUpdateDisplayNameUseCase.mockResolvedValue(user);

            await sut.updateDisplayName(USER_ID, 'Grace Hopper');

            expect(mockUpdateDisplayNameUseCase).toHaveBeenCalledTimes(1);
            expect(mockUpdateDisplayNameUseCase).toHaveBeenCalledWith(mockUsersRepository, USER_ID, 'Grace Hopper');
        });

        it('passes a null through, so the caller can clear the display name', async () => {
            mockUpdateDisplayNameUseCase.mockResolvedValue(user);

            await sut.updateDisplayName(USER_ID, null);

            expect(mockUpdateDisplayNameUseCase).toHaveBeenCalledWith(mockUsersRepository, USER_ID, null);
        });

        it('returns the user the use case gives back', async () => {
            mockUpdateDisplayNameUseCase.mockResolvedValue(user);

            await expect(sut.updateDisplayName(USER_ID, 'Grace Hopper')).resolves.toBe(user);
        });

        it('propagates the error of the use case unchanged', async () => {
            const error = new ProfileNotFoundError();

            mockUpdateDisplayNameUseCase.mockRejectedValue(error);

            await expect(sut.updateDisplayName(USER_ID, 'Grace Hopper')).rejects.toThrow(error);
        });
    });

    describe('changeEmail', () => {
        it('delegates to the use case with every injected collaborator', async () => {
            mockChangeEmailUseCase.mockResolvedValue(tokens);

            await sut.changeEmail(USER_ID, 'ada@example.com');

            expect(mockChangeEmailUseCase).toHaveBeenCalledTimes(1);
            expect(mockChangeEmailUseCase).toHaveBeenCalledWith(
                mockUsersRepository,
                mockRefreshTokensRepository,
                mockTokenService,
                USER_ID,
                'ada@example.com',
            );
        });

        it('returns the pair the use case gives back', async () => {
            mockChangeEmailUseCase.mockResolvedValue(tokens);

            await expect(sut.changeEmail(USER_ID, 'ada@example.com')).resolves.toBe(tokens);
        });

        it('propagates the error of the use case unchanged', async () => {
            const error = new Error('email is taken');

            mockChangeEmailUseCase.mockRejectedValue(error);

            await expect(sut.changeEmail(USER_ID, 'ada@example.com')).rejects.toThrow(error);
        });
    });

    describe('changePassword', () => {
        it('delegates to the use case with every injected collaborator', async () => {
            mockChangePasswordUseCase.mockResolvedValue(tokens);

            await sut.changePassword(USER_ID, 'old-secret', 'new-secret');

            expect(mockChangePasswordUseCase).toHaveBeenCalledTimes(1);
            expect(mockChangePasswordUseCase).toHaveBeenCalledWith(
                mockUsersRepository,
                mockRefreshTokensRepository,
                mockTokenService,
                mockPasswordHasher,
                USER_ID,
                'old-secret',
                'new-secret',
            );
        });

        it('returns the pair the use case gives back', async () => {
            mockChangePasswordUseCase.mockResolvedValue(tokens);

            await expect(sut.changePassword(USER_ID, 'old-secret', 'new-secret')).resolves.toBe(tokens);
        });

        it('propagates the error of the use case unchanged', async () => {
            const error = new Error('password does not match');

            mockChangePasswordUseCase.mockRejectedValue(error);

            await expect(sut.changePassword(USER_ID, 'old-secret', 'new-secret')).rejects.toThrow(error);
        });
    });
});
