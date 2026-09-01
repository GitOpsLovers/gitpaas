/* eslint-disable no-secrets/no-secrets */
import { Test } from '@nestjs/testing';

import { changeEmailUseCase } from '../../../application/change-email.use-case';
import { changePasswordUseCase } from '../../../application/change-password.use-case';
import { disableTotpUseCase } from '../../../application/disable-totp.use-case';
import { enableTotpUseCase } from '../../../application/enable-totp.use-case';
import { getProfileUseCase } from '../../../application/get-profile.use-case';
import { startTotpSetupUseCase } from '../../../application/start-totp-setup.use-case';
import { updateDisplayNameUseCase } from '../../../application/update-display-name.use-case';
import { ProfileNotFoundError } from '../../../domain/errors/profile.errors';
import { TotpSetup } from '../../../domain/models/totp-setup.models';
import { ProfileService } from '../profile.service';

import { OtplibTotpAdapter } from '@core/infrastructure/crypto/otplib-totp.adapter';
import { SecretCipherAdapter } from '@core/infrastructure/crypto/secret-cipher.adapter';
import { QrCodeRendererAdapter } from '@core/infrastructure/qrcode/qrcode-renderer.adapter';
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
jest.mock('../../../application/start-totp-setup.use-case');
jest.mock('../../../application/enable-totp.use-case');
jest.mock('../../../application/disable-totp.use-case');

const mockGetProfileUseCase = getProfileUseCase as jest.MockedFunction<typeof getProfileUseCase>;
const mockUpdateDisplayNameUseCase = updateDisplayNameUseCase as jest.MockedFunction<typeof updateDisplayNameUseCase>;
const mockChangeEmailUseCase = changeEmailUseCase as jest.MockedFunction<typeof changeEmailUseCase>;
const mockChangePasswordUseCase = changePasswordUseCase as jest.MockedFunction<typeof changePasswordUseCase>;
const mockStartTotpSetupUseCase = startTotpSetupUseCase as jest.MockedFunction<typeof startTotpSetupUseCase>;
const mockEnableTotpUseCase = enableTotpUseCase as jest.MockedFunction<typeof enableTotpUseCase>;
const mockDisableTotpUseCase = disableTotpUseCase as jest.MockedFunction<typeof disableTotpUseCase>;

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
    let mockTotp: jest.Mocked<OtplibTotpAdapter>;
    let mockQrCodeRenderer: jest.Mocked<QrCodeRendererAdapter>;
    let mockSecretCipher: jest.Mocked<SecretCipherAdapter>;
    let sut: ProfileService;

    beforeEach(async () => {
        jest.clearAllMocks();

        mockUsersRepository = {} as jest.Mocked<DatabaseUsersRepository>;
        mockRefreshTokensRepository = {} as jest.Mocked<DatabaseRefreshTokensRepository>;
        mockTokenService = {} as jest.Mocked<JwtTokenServiceAdapter>;
        mockPasswordHasher = {} as jest.Mocked<Argon2PasswordHasherAdapter>;
        mockTotp = {} as jest.Mocked<OtplibTotpAdapter>;
        mockQrCodeRenderer = {} as jest.Mocked<QrCodeRendererAdapter>;
        mockSecretCipher = {} as jest.Mocked<SecretCipherAdapter>;

        const moduleRef = await Test.createTestingModule({
            providers: [
                ProfileService,
                { provide: DatabaseUsersRepository, useValue: mockUsersRepository },
                { provide: DatabaseRefreshTokensRepository, useValue: mockRefreshTokensRepository },
                { provide: JwtTokenServiceAdapter, useValue: mockTokenService },
                { provide: Argon2PasswordHasherAdapter, useValue: mockPasswordHasher },
                { provide: OtplibTotpAdapter, useValue: mockTotp },
                { provide: QrCodeRendererAdapter, useValue: mockQrCodeRenderer },
                { provide: SecretCipherAdapter, useValue: mockSecretCipher },
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

    describe('startTotpSetup', () => {
        const setup: TotpSetup = {
            secret: 'JBSWY3DPEHPK3PXP',
            otpauthUri: 'otpauth://totp/GitPaaS:admin@example.com?secret=JBSWY3DPEHPK3PXP',
            qrCode: 'data:image/png;base64,AAAA',
        };

        it('delegates to the use case with every injected collaborator', async () => {
            mockStartTotpSetupUseCase.mockResolvedValue(setup);

            const result = await sut.startTotpSetup(USER_ID);

            expect(mockStartTotpSetupUseCase).toHaveBeenCalledTimes(1);
            expect(mockStartTotpSetupUseCase).toHaveBeenCalledWith(
                mockUsersRepository,
                mockTotp,
                mockQrCodeRenderer,
                mockSecretCipher,
                USER_ID,
            );
            expect(result).toBe(setup);
        });

        it('propagates the error the use case raises', async () => {
            const error = new ProfileNotFoundError();
            mockStartTotpSetupUseCase.mockRejectedValue(error);

            await expect(sut.startTotpSetup(USER_ID)).rejects.toBe(error);
        });
    });

    describe('enableTotp', () => {
        it('delegates to the use case with the code and returns the updated user', async () => {
            mockEnableTotpUseCase.mockResolvedValue(user);

            const result = await sut.enableTotp(USER_ID, '123456');

            expect(mockEnableTotpUseCase).toHaveBeenCalledTimes(1);
            expect(mockEnableTotpUseCase).toHaveBeenCalledWith(
                mockUsersRepository,
                mockTotp,
                mockSecretCipher,
                USER_ID,
                '123456',
            );
            expect(result).toBe(user);
        });

        it('propagates the error the use case raises', async () => {
            const error = new ProfileNotFoundError();
            mockEnableTotpUseCase.mockRejectedValue(error);

            await expect(sut.enableTotp(USER_ID, '123456')).rejects.toBe(error);
        });
    });

    describe('disableTotp', () => {
        it('delegates to the use case with the injected repository and returns the updated user', async () => {
            mockDisableTotpUseCase.mockResolvedValue(user);

            const result = await sut.disableTotp(USER_ID);

            expect(mockDisableTotpUseCase).toHaveBeenCalledTimes(1);
            expect(mockDisableTotpUseCase).toHaveBeenCalledWith(mockUsersRepository, USER_ID);
            expect(result).toBe(user);
        });

        it('propagates the error the use case raises', async () => {
            const error = new ProfileNotFoundError();
            mockDisableTotpUseCase.mockRejectedValue(error);

            await expect(sut.disableTotp(USER_ID)).rejects.toBe(error);
        });
    });
});
