import { CreateUserDto } from '../dtos/create-user.dto';
import { User } from '../models/user.models';

/**
 * Users repository
 */
export interface UsersRepository {
    /**
     * Finds a single user by email
     *
     * @param email User email
     *
     * @returns User, or `null` when it does not exist
     */
    findByEmail: (email: string) => Promise<User | null>;

    /**
     * Finds a single user by id
     *
     * @param id User id
     *
     * @returns User, or `null` when it does not exist
     */
    findById: (id: string) => Promise<User | null>;

    /**
     * Creates a user
     *
     * @param input User data (with an already-hashed password)
     *
     * @returns Created user
     */
    create: (input: CreateUserDto) => Promise<User>;

    /**
     * Updates the display name of a user
     *
     * @param id User id
     * @param displayName Display name, or `null` to clear it
     *
     * @returns Updated user, or `null` when it does not exist
     */
    updateDisplayName: (id: string, displayName: string | null) => Promise<User | null>;

    /**
     * Updates the email address of a user
     *
     * @param id User id
     * @param email Email address
     *
     * @returns Updated user, or `null` when it does not exist
     */
    updateEmail: (id: string, email: string) => Promise<User | null>;

    /**
     * Updates the hash of the password of a user
     *
     * @param id User id
     * @param passwordHash Already-hashed password
     *
     * @returns Updated user, or `null` when it does not exist
     */
    updatePasswordHash: (id: string, passwordHash: string) => Promise<User | null>;

    /**
     * Updates the state of the second factor of a user
     *
     * @param id User id
     * @param totpSecret Sealed TOTP secret, or `null` when the second factor is off
     * @param totpEnabledAt Instant the second factor was confirmed, or `null` when it is not
     *
     * @returns Updated user, or `null` when it does not exist
     */
    updateTotp: (id: string, totpSecret: string | null, totpEnabledAt: Date | null) => Promise<User | null>;
}
