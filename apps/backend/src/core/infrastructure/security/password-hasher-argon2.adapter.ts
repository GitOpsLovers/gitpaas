import { Injectable } from '@nestjs/common';
import * as argon2 from 'argon2';

import { PasswordHasher } from '../../domain/ports/password-hasher.port';

/**
 * argon2id-backed implementation of the {@link PasswordHasher} port.
 */
@Injectable()
export class PasswordHasherArgon2Adapter implements PasswordHasher {
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
