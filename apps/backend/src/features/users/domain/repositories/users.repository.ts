import { CreateUserDto } from '../dtos/create-user.dto';
import { User } from '../models/user.model';

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
}
