import { SeedFirstUserDto } from '../domain/dtos/seed-first-user.dto';
import { UsersRepository } from '../domain/repositories/users.repository';

import { PasswordHasher } from '@shared/domain/ports/password-hasher.port';

/**
 * Use case to seed the first user of the platform.
 *
 * @param usersRepository Users repository
 * @param passwordHasher Password hasher
 * @param seedDto Seed data
 *
 * @returns Whether a fresh user was seeded or one already existed
 *
 * @throws {Error} When the email or password is missing
 */
export async function seedFirstUserUseCase(
    usersRepository: UsersRepository,
    passwordHasher: PasswordHasher,
    seedDto: SeedFirstUserDto,
): Promise<'seeded' | 'already-exists'> {
    const normalizedEmail = seedDto.email.trim();

    if (!normalizedEmail) {
        throw new Error('An email is required to seed the first user');
    }
    if (!seedDto.password) {
        throw new Error('A password is required to seed the first user');
    }

    // An existing user is left untouched and its password is NOT rotated.
    const existing = await usersRepository.findByEmail(normalizedEmail);

    if (existing) {
        return 'already-exists';
    }

    // Hash with the backend's own argon2id options so login can verify it.
    const passwordHash = await passwordHasher.hash(seedDto.password);

    await usersRepository.create({
        email: normalizedEmail,
        passwordHash,
        isActive: true,
    });

    return 'seeded';
}
