import { SeedAdminDto } from '../domain/dtos/seed-admin.dto';
import { UserRole } from '../domain/models/user.models';
import { UsersRepository } from '../domain/repositories/users.repository';

import { PasswordHasher } from '@shared/domain/ports/password-hasher.port';

/**
 * Use case to seed a single administrative user into the system.
 *
 * @param usersRepository Users repository
 * @param passwordHasher Password hasher
 * @param seedDto Seed data
 *
 * @returns Whether a fresh admin was seeded or one already existed
 *
 * @throws {Error} When the email or password is missing
 */
export async function seedAdminUseCase(
    usersRepository: UsersRepository,
    passwordHasher: PasswordHasher,
    seedDto: SeedAdminDto,
): Promise<'seeded' | 'already-exists'> {
    const normalizedEmail = seedDto.email.trim();

    if (!normalizedEmail) {
        throw new Error('An admin email is required to seed');
    }
    if (!seedDto.password) {
        throw new Error('An admin password is required to seed');
    }

    // An existing admin is left untouched and its password is NOT rotated.
    const existing = await usersRepository.findByEmail(normalizedEmail);

    if (existing) {
        return 'already-exists';
    }

    // Hash with the backend's own argon2id options so login can verify it.
    const passwordHash = await passwordHasher.hash(seedDto.password);

    await usersRepository.create({
        email: normalizedEmail,
        passwordHash,
        role: UserRole.Admin,
        isActive: true,
    });

    return 'seeded';
}
