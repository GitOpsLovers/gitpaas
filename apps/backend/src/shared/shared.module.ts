import { Module } from '@nestjs/common';

import { Argon2PasswordHasherAdapter } from './infrastructure/security/argon2-password-hasher.adapter';

/**
 * Shared module.
 */
@Module({
    providers: [Argon2PasswordHasherAdapter],
    exports: [Argon2PasswordHasherAdapter],
})
export class SharedModule {}
