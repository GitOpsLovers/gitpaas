import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

import { Injectable } from '@nestjs/common';

import type { SecretCipher } from '../../domain/ports/secret-cipher.port';

/**
 * Authenticated cipher every secret is sealed with.
 */
const ALGORITHM = 'aes-256-gcm';

/**
 * Length, in bytes, of the key the environment must hold.
 */
const KEY_BYTES = 32;

/**
 * Length, in bytes, of the initialisation vector drawn for every payload.
 */
const IV_BYTES = 12;

/**
 * Separator between the three hexadecimal parts of a sealed payload.
 */
const PART_SEPARATOR = ':';

/**
 * Name of the environment variable that carries the key of the encryption.
 */
const KEY_VARIABLE = 'SECRETS_ENCRYPTION_KEY';

/**
 * Reads the key of the encryption from the environment.
 *
 * The key is read on every call, and never cached, so a spec can swap it and so
 * a rotation of the variable needs no restart of the process.
 *
 * @returns The 32 raw bytes of the key
 *
 * @throws Error When the variable is absent, or does not hold 32 bytes in the hexadecimal form
 */
function readKey(): Buffer {
    // eslint-disable-next-line security/detect-object-injection
    const raw = process.env[KEY_VARIABLE];

    if (!raw) {
        throw new Error(`${KEY_VARIABLE} is not set`);
    }

    const key = Buffer.from(raw, 'hex');

    if (key.byteLength !== KEY_BYTES) {
        throw new Error(`${KEY_VARIABLE} must hold ${KEY_BYTES} bytes in the hexadecimal form`);
    }

    return key;
}

/**
 * AES-256-GCM secret cipher adapter.
 */
@Injectable()
export class SecretCipherAdapter implements SecretCipher {
    /**
     * Seals a secret with AES-256-GCM, under the key of the environment.
     *
     * The result carries the initialisation vector, the authentication tag and the
     * cipher text, each in the hexadecimal form and separated by a colon. A fresh
     * vector is drawn for every call, so the same secret never seals to the same
     * payload twice.
     *
     * @param plainText Secret to seal
     *
     * @returns The sealed payload
     */
    public encryptSecret(plainText: string): string {
        const iv = randomBytes(IV_BYTES);
        const cipher = createCipheriv(ALGORITHM, readKey(), iv);

        const cipherText = Buffer.concat([cipher.update(plainText, 'utf8'), cipher.final()]);
        const authTag = cipher.getAuthTag();

        return [iv.toString('hex'), authTag.toString('hex'), cipherText.toString('hex')].join(PART_SEPARATOR);
    }

    /**
     * Opens a payload that {@link SecretCipherAdapter.encryptSecret} sealed.
     *
     * @param payload Sealed payload
     *
     * @returns The secret in clear text
     *
     * @throws Error When the payload is malformed, or when the key does not open it
     */
    public decryptSecret(payload: string): string {
        const parts = payload.split(PART_SEPARATOR);

        if (parts.length !== 3) {
            throw new Error('The sealed payload is malformed');
        }

        const [iv, authTag, cipherText] = parts;

        const decipher = createDecipheriv(ALGORITHM, readKey(), Buffer.from(iv, 'hex'));

        decipher.setAuthTag(Buffer.from(authTag, 'hex'));

        return Buffer.concat([decipher.update(Buffer.from(cipherText, 'hex')), decipher.final()]).toString('utf8');
    }
}
