import { ProfileNotFoundError, TotpAlreadyEnabledError, TotpNotStartedError } from '../domain/errors/profile.errors';

import { SecretCipher } from '@core/domain/ports/secret-cipher.port';
import { Totp } from '@core/domain/ports/totp.port';
import { InvalidTotpCodeError } from '@features/authentication/domain/errors/authentication.errors';
import { User } from '@features/users/domain/models/user.models';
import { UsersRepository } from '@features/users/domain/repositories/users.repository';

/**
 * Use case that confirms a setup of the second factor.
 *
 * @param usersRepository Users repository
 * @param totp One-time password port
 * @param secretCipher Secret cipher port, which opens the stored secret
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
export async function enableTotpUseCase(
    usersRepository: UsersRepository,
    totp: Totp,
    secretCipher: SecretCipher,
    userId: string,
    code: string,
): Promise<User> {
    const user = await usersRepository.findById(userId);

    if (!user) {
        throw new ProfileNotFoundError();
    }

    if (user.totpEnabledAt !== null) {
        throw new TotpAlreadyEnabledError();
    }

    if (user.totpSecret === null) {
        throw new TotpNotStartedError();
    }

    if (!(await totp.verifyCode(secretCipher.decryptSecret(user.totpSecret), code))) {
        throw new InvalidTotpCodeError();
    }

    const updated = await usersRepository.updateTotp(userId, user.totpSecret, new Date());

    if (!updated) {
        throw new ProfileNotFoundError();
    }

    return updated;
}
