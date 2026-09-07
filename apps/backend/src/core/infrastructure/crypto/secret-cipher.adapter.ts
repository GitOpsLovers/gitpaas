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
 * Separator between the parts of a sealed payload.
 */
const PART_SEPARATOR = ':';

/**
 * Number of parts of a payload sealed before the binding to a row existed.
 */
const LEGACY_PART_COUNT = 3;

/**
 * First part of a payload that is bound to the row that holds it.
 */
const BOUND_MARKER = 'v2';

/**
 * Number of parts of a payload that carries the marker of the binding.
 */
const BOUND_PART_COUNT = 4;

/**
 * Name of the environment variable that carries the key of the encryption.
 */
const KEY_VARIABLE = 'SECRETS_ENCRYPTION_KEY';

/**
 * Reads the key of the encryption from the environment.
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
    public encryptSecret(plainText: string, aad?: string): string {
        const iv = randomBytes(IV_BYTES);
        const cipher = createCipheriv(ALGORITHM, readKey(), iv);

        if (aad !== undefined) {
            cipher.setAAD(Buffer.from(aad, 'utf8'));
        }

        const cipherText = Buffer.concat([cipher.update(plainText, 'utf8'), cipher.final()]);
        const authTag = cipher.getAuthTag();

        const parts = [iv.toString('hex'), authTag.toString('hex'), cipherText.toString('hex')];

        return (aad === undefined ? parts : [BOUND_MARKER, ...parts]).join(PART_SEPARATOR);
    }

    public decryptSecret(payload: string, aad?: string): string {
        const parts = payload.split(PART_SEPARATOR);
        const isBound = parts.length === BOUND_PART_COUNT && parts[0] === BOUND_MARKER;

        if (!isBound && parts.length !== LEGACY_PART_COUNT) {
            throw new Error('The sealed payload is malformed');
        }

        if (isBound && aad === undefined) {
            throw new Error('The sealed payload is bound to a row, and no identifier was given');
        }

        const [iv, authTag, cipherText] = isBound ? parts.slice(1) : parts;

        const decipher = createDecipheriv(ALGORITHM, readKey(), Buffer.from(iv, 'hex'));

        if (isBound && aad !== undefined) {
            decipher.setAAD(Buffer.from(aad, 'utf8'));
        }

        decipher.setAuthTag(Buffer.from(authTag, 'hex'));

        return Buffer.concat([decipher.update(Buffer.from(cipherText, 'hex')), decipher.final()]).toString('utf8');
    }
}
