import { UserRole } from '../domain/models/user.model';
import { UsersRepository } from '../domain/repositories/users.repository';

import { PasswordHasher } from '@core/domain/security/password-hasher';

/**
 * Credentials for a single admin to provision.
 */
export interface SeedAdminInput {
    /** The operator's email — becomes the login and the conflict key. */
    email: string;
    /** The plaintext password, hashed with argon2id before it is stored. */
    password: string;
}

/**
 * Outcome of a seed attempt, so the caller can log without the use case
 * touching the console:
 *
 * - `'seeded'` — no admin existed for the email, so a fresh active admin was created.
 * - `'already-exists'` — an admin already existed and was left untouched (its
 *   password is NOT rotated).
 */
export type SeedAdminResult = 'seeded' | 'already-exists';

/**
 * Shared admin-seeding use case reused by every trigger (the production install
 * CLI and the development bootstrap hook), so both provision an administrator
 * through one identical code path.
 *
 * It depends only on domain ports: it hashes the password with the injected
 * {@link PasswordHasher} (argon2id in production) so the stored credential is
 * byte-for-byte what the login flow verifies, and persists through the
 * {@link UsersRepository}.
 *
 * The `users` table is NOT created here: callers must run this only AFTER the
 * schema exists — in production once migrations have applied, in development once
 * TypeORM `synchronize` has built the schema on boot.
 *
 * Idempotency: re-running with the same email is a safe no-op (the existing
 * admin is left untouched and its password is NOT rotated).
 *
 * @param usersRepository Users repository port
 * @param passwordHasher Password hashing port
 * @param input The admin credentials to seed
 *
 * @returns Whether a fresh admin was seeded or one already existed
 *
 * @throws {Error} When the email or password is missing
 */
export async function seedAdminUseCase(
    usersRepository: UsersRepository,
    passwordHasher: PasswordHasher,
    { email, password }: SeedAdminInput,
): Promise<SeedAdminResult> {
    const normalizedEmail = email.trim();

    if (!normalizedEmail) {
        throw new Error('An admin email is required to seed');
    }
    if (!password) {
        throw new Error('An admin password is required to seed');
    }

    // Idempotent: an existing admin is left untouched and its password is NOT rotated.
    const existing = await usersRepository.findByEmail(normalizedEmail);

    if (existing) {
        return 'already-exists';
    }

    // Hash with the backend's own argon2id options so login can verify it.
    const passwordHash = await passwordHasher.hash(password);

    await usersRepository.create({
        email: normalizedEmail,
        passwordHash,
        role: UserRole.Admin,
        isActive: true,
    });

    return 'seeded';
}
