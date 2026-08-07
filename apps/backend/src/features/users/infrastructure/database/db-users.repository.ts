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
}
