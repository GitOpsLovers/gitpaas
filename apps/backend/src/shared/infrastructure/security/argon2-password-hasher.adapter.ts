import { Injectable } from '@nestjs/common';
import * as argon2 from 'argon2';

import { PasswordHasher } from '../../domain/ports/password-hasher.port';

/**
 * Argon2 password hasher adapter.
 */
@Injectable()
export class Argon2PasswordHasherAdapter implements PasswordHasher {
    public hash(plain: string): Promise<string> {
        return argon2.hash(plain, { type: argon2.argon2id });
    }

    public async verify(hash: string, plain: string): Promise<boolean> {
        try {
            return await argon2.verify(hash, plain);
        } catch {
            return false;
        }
    }
}
