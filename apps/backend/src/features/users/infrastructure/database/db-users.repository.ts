import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { CreateUserDto } from '../../domain/dtos/create-user.dto';
import { User } from '../../domain/models/user.models';
import { UsersRepository } from '../../domain/repositories/users.repository';

import { DbUserEntity } from './db-user.entity';
import { toUser } from './db-users.transformer';

/**
 * Users database repository
 */
@Injectable()
export class DatabaseUsersRepository implements UsersRepository {
    constructor(
        @InjectRepository(DbUserEntity)
        private readonly repository: Repository<DbUserEntity>,
    ) {}

    /**
     * Finds a single user by email
     *
     * @param email User email
     *
     * @returns User, or `null` when it does not exist
     */
    public async findByEmail(email: string): Promise<User | null> {
        const user = await this.repository.findOneBy({ email });

        if (!user) {
            return null;
        }

        return toUser(user);
    }

    /**
     * Finds a single user by id
     *
     * @param id User id
     *
     * @returns User, or `null` when it does not exist
     */
    public async findById(id: string): Promise<User | null> {
        const user = await this.repository.findOneBy({ id });

        if (!user) {
            return null;
        }

        return toUser(user);
    }

    /**
     * Creates a user
     *
     * @param input User data (with an already-hashed password)
     *
     * @returns Created user
     */
    public async create(input: CreateUserDto): Promise<User> {
        const user = this.repository.create(input);
        const saved = await this.repository.save(user);

        return toUser(saved);
    }

    /**
     * Updates the display name of a user
     *
     * @param id User id
     * @param displayName Display name, or `null` to clear it
     *
     * @returns Updated user, or `null` when it does not exist
     */
    public async updateDisplayName(id: string, displayName: string | null): Promise<User | null> {
        return this.updateColumns(id, { displayName });
    }

    /**
     * Updates the email address of a user
     *
     * @param id User id
     * @param email Email address
     *
     * @returns Updated user, or `null` when it does not exist
     */
    public async updateEmail(id: string, email: string): Promise<User | null> {
        return this.updateColumns(id, { email });
    }

    /**
     * Updates the hash of the password of a user
     *
     * @param id User id
     * @param passwordHash Already-hashed password
     *
     * @returns Updated user, or `null` when it does not exist
     */
    public async updatePasswordHash(id: string, passwordHash: string): Promise<User | null> {
        return this.updateColumns(id, { passwordHash });
    }

    /**
     * Updates the state of the second factor of a user
     *
     * @param id User id
     * @param totpSecret Sealed TOTP secret, or `null` when the second factor is off
     * @param totpEnabledAt Instant the second factor was confirmed, or `null` when it is not
     *
     * @returns Updated user, or `null` when it does not exist
     */
    public async updateTotp(id: string, totpSecret: string | null, totpEnabledAt: Date | null): Promise<User | null> {
        return this.updateColumns(id, { totpSecret, totpEnabledAt });
    }

    /**
     * Merges a partial row into the stored user and saves it
     *
     * @param id User id
     * @param changes Columns to write
     *
     * @returns Updated user, or `null` when it does not exist
     */
    private async updateColumns(id: string, changes: Partial<DbUserEntity>): Promise<User | null> {
        const user = await this.repository.findOneBy({ id });

        if (!user) {
            return null;
        }

        this.repository.merge(user, changes);

        const saved = await this.repository.save(user);

        return toUser(saved);
    }
}
