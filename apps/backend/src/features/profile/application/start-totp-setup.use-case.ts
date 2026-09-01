import { ProfileNotFoundError } from '../domain/errors/profile.errors';
import { TotpSetup } from '../domain/models/totp-setup.models';

import { QrCodeRenderer } from '@core/domain/ports/qr-code-renderer.port';
import { SecretCipher } from '@core/domain/ports/secret-cipher.port';
import { Totp } from '@core/domain/ports/totp.port';
import { UsersRepository } from '@features/users/domain/repositories/users.repository';

/**
 * Use case that starts a setup of the second factor.
 *
 * @param usersRepository Users repository
 * @param totp One-time password port
 * @param qrCodeRenderer QR code rendering port
 * @param secretCipher Secret cipher port, which seals the drawn secret
 * @param userId Identifier of the user of the token
 *
 * @returns The secret, the `otpauth://` address and the image of the QR code
 *
 * @throws {ProfileNotFoundError} When no user carries that identifier
 */
export async function startTotpSetupUseCase(
    usersRepository: UsersRepository,
    totp: Totp,
    qrCodeRenderer: QrCodeRenderer,
    secretCipher: SecretCipher,
    userId: string,
): Promise<TotpSetup> {
    const user = await usersRepository.findById(userId);

    if (!user) {
        throw new ProfileNotFoundError();
    }

    const secret = totp.generateSecret();
    const otpauthUri = totp.buildKeyUri(secret, user.email);
    const qrCode = await qrCodeRenderer.toDataUrl(otpauthUri);

    await usersRepository.updateTotp(userId, secretCipher.encryptSecret(secret), null);

    return { secret, otpauthUri, qrCode };
}
