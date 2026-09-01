import { Inject, Injectable } from '@nestjs/common';

import { changeEmailUseCase } from '../../application/change-email.use-case';
import { changePasswordUseCase } from '../../application/change-password.use-case';
import { disableTotpUseCase } from '../../application/disable-totp.use-case';
import { enableTotpUseCase } from '../../application/enable-totp.use-case';
import { getProfileUseCase } from '../../application/get-profile.use-case';
import { startTotpSetupUseCase } from '../../application/start-totp-setup.use-case';
import { updateDisplayNameUseCase } from '../../application/update-display-name.use-case';
import { TotpSetup } from '../../domain/models/totp-setup.models';

import type { QrCodeRenderer } from '@core/domain/ports/qr-code-renderer.port';
import type { SecretCipher } from '@core/domain/ports/secret-cipher.port';
import type { Totp } from '@core/domain/ports/totp.port';
import { OtplibTotpAdapter } from '@core/infrastructure/crypto/otplib-totp.adapter';
import { SecretCipherAdapter } from '@core/infrastructure/crypto/secret-cipher.adapter';
import { QrCodeRendererAdapter } from '@core/infrastructure/qrcode/qrcode-renderer.adapter';
import { AuthTokens } from '@features/authentication/domain/models/auth-tokens.models';
import type { TokenService } from '@features/authentication/domain/ports/token-service.port';
import type { RefreshTokensRepository } from '@features/authentication/domain/repositories/refresh-tokens.repository';
import { DatabaseRefreshTokensRepository } from '@features/authentication/infrastructure/database/db-refresh-tokens.repository';
import { JwtTokenServiceAdapter } from '@features/authentication/infrastructure/security/jwt-token-service.adapter';
import { User } from '@features/users/domain/models/user.models';
import type { UsersRepository } from '@features/users/domain/repositories/users.repository';
import { DatabaseUsersRepository } from '@features/users/infrastructure/database/db-users.repository';
import type { PasswordHasher } from '@shared/domain/ports/password-hasher.port';
import { Argon2PasswordHasherAdapter } from '@shared/infrastructure/security/argon2-password-hasher.adapter';

/**
 * Profile feature service.
 */
@Injectable()
export class ProfileService {
    constructor(
        @Inject(DatabaseUsersRepository)
        private readonly usersRepository: UsersRepository,
        @Inject(DatabaseRefreshTokensRepository)
        private readonly refreshTokensRepository: RefreshTokensRepository,
        @Inject(JwtTokenServiceAdapter)
        private readonly tokenService: TokenService,
        @Inject(Argon2PasswordHasherAdapter)
        private readonly passwordHasher: PasswordHasher,
        @Inject(OtplibTotpAdapter)
        private readonly totp: Totp,
        @Inject(QrCodeRendererAdapter)
        private readonly qrCodeRenderer: QrCodeRenderer,
        @Inject(SecretCipherAdapter)
        private readonly secretCipher: SecretCipher,
    ) {}

    /**
     * Read the account of the user of the token
     *
     * @param userId Identifier of the user of the token
     *
     * @returns The stored user
     *
     * @throws {ProfileNotFoundError} When no user carries that identifier
     */
    public getProfile(userId: string): Promise<User> {
        return getProfileUseCase(this.usersRepository, userId);
    }

    /**
     * Change the display name of the account of the user of the token
     *
     * @param userId Identifier of the user of the token
     * @param displayName Display name, or `null` to clear it
     *
     * @returns The updated user
     *
     * @throws {ProfileNotFoundError} When no user carries that identifier
     */
    public updateDisplayName(userId: string, displayName: string | null): Promise<User> {
        return updateDisplayNameUseCase(this.usersRepository, userId, displayName);
    }

    /**
     * Change the email address of the account of the user of the token
     *
     * @param userId Identifier of the user of the token
     * @param email The email address to write
     *
     * @returns A freshly issued access + refresh token pair
     *
     * @throws {EmailTakenError} When another user already holds that address
     * @throws {ProfileNotFoundError} When no user carries that identifier
     */
    public changeEmail(userId: string, email: string): Promise<AuthTokens> {
        return changeEmailUseCase(
            this.usersRepository,
            this.refreshTokensRepository,
            this.tokenService,
            userId,
            email,
        );
    }

    /**
     * Change the password of the account of the user of the token
     *
     * @param userId Identifier of the user of the token
     * @param currentPassword The password the account holds today
     * @param newPassword The password to write
     *
     * @returns A freshly issued access + refresh token pair
     *
     * @throws {ProfileNotFoundError} When no user carries that identifier
     * @throws {InvalidCurrentPasswordError} When the current password does not match
     */
    public changePassword(userId: string, currentPassword: string, newPassword: string): Promise<AuthTokens> {
        return changePasswordUseCase(
            this.usersRepository,
            this.refreshTokensRepository,
            this.tokenService,
            this.passwordHasher,
            userId,
            currentPassword,
            newPassword,
        );
    }

    /**
     * Start a setup of the second factor for the user of the token
     *
     * @param userId Identifier of the user of the token
     *
     * @returns The secret, the `otpauth://` address and the image of the QR code
     *
     * @throws {ProfileNotFoundError} When no user carries that identifier
     */
    public startTotpSetup(userId: string): Promise<TotpSetup> {
        return startTotpSetupUseCase(
            this.usersRepository,
            this.totp,
            this.qrCodeRenderer,
            this.secretCipher,
            userId,
        );
    }

    /**
     * Confirm a setup of the second factor for the user of the token
     *
     * @param userId Identifier of the user of the token
     * @param code The code of six digits the client presented
     *
     * @returns The updated user
     *
     * @throws {ProfileNotFoundError} When no user carries that identifier
     * @throws {TotpAlreadyEnabledError} When the account already holds a second factor
     * @throws {TotpNotStartedError} When no setup drew a secret first
     * @throws {InvalidTotpCodeError} When the code does not match that secret
     */
    public enableTotp(userId: string, code: string): Promise<User> {
        return enableTotpUseCase(this.usersRepository, this.totp, this.secretCipher, userId, code);
    }

    /**
     * Turn the second factor off for the user of the token
     *
     * @param userId Identifier of the user of the token
     *
     * @returns The updated user
     *
     * @throws {ProfileNotFoundError} When no user carries that identifier
     */
    public disableTotp(userId: string): Promise<User> {
        return disableTotpUseCase(this.usersRepository, userId);
    }
}
