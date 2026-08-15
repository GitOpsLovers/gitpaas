import { createHash } from 'node:crypto';

import { Provider, ProviderCredentials } from '../../domain/models/provider.models';

import { DbProviderEntity } from './db-provider.entity';

import type { SecretCipher } from '@core/domain/ports/secret-cipher.port';

/**
 * Number of characters of the digest the fingerprint keeps.
 */
const FINGERPRINT_LENGTH = 8;

/**
 * Fingerprint shown when the stored key cannot be opened with the current key of
 * the encryption.
 */
const UNKNOWN_FINGERPRINT = '';

/**
 * Builds the fingerprint of a stored private key.
 *
 * The fingerprint is the first eight characters of the SHA-256 of the PEM. It
 * lets an operator recognize a key, and it gives no way back to the key.
 *
 * @param cipher Secret cipher
 * @param encryptedPrivateKey Sealed private key of the row
 *
 * @returns The fingerprint, or an empty string when the key cannot be opened
 */
function toKeyFingerprint(cipher: SecretCipher, encryptedPrivateKey: string): string {
    try {
        return createHash('sha256')
            .update(cipher.decryptSecret(encryptedPrivateKey))
            .digest('hex')
            .slice(0, FINGERPRINT_LENGTH);
    } catch {
        return UNKNOWN_FINGERPRINT;
    }
}

/**
 * Maps a provider database entity into its domain model.
 *
 * The result carries the fingerprint of the private key, and never the key itself.
 *
 * @param cipher Secret cipher
 * @param entity Provider database entity
 *
 * @returns Domain provider
 */
export function toProvider(cipher: SecretCipher, entity: DbProviderEntity): Provider {
    return {
        id: entity.id,
        name: entity.name,
        type: entity.type,
        appId: entity.appId,
        installationId: entity.installationId,
        keyFingerprint: toKeyFingerprint(cipher, entity.encryptedPrivateKey),
        createdAt: entity.createdAt,
        updatedAt: entity.updatedAt,
    };
}

/**
 * Maps a provider database entity into the credentials the source control consumes.
 *
 * The private key is opened here, so the result never leaves the server.
 *
 * @param cipher Secret cipher
 * @param entity Provider database entity
 *
 * @returns Credentials of the provider
 */
export function toProviderCredentials(cipher: SecretCipher, entity: DbProviderEntity): ProviderCredentials {
    return {
        providerId: entity.id,
        appId: entity.appId,
        installationId: entity.installationId,
        privateKey: cipher.decryptSecret(entity.encryptedPrivateKey),
    };
}
