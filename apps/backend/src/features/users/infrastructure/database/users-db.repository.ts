import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { CreateUserDto } from '../../domain/dtos/create-user.dto';
import { User } from '../../domain/models/user.model';
import { UsersRepository } from '../../domain/repositories/users.repository';

import { UserDbEntity } from './user-db.entity';
import { toUser } from './users-db.transformer';

/**
 * Users database repository
 */
@Injectable()
export class UsersDatabaseRepository implements UsersRepository {
    constructor(
        @InjectRepository(UserDbEntity)
        private readonly repository: Repository<UserDbEntity>,
    ) {}

    public async findByEmail(email: string): Promise<User | null> {
        const user = await this.repository.findOneBy({ email });

        if (!user) {
            return null;
        }

        return toUser(user);
    }

    public async findById(id: string): Promise<User | null> {
        const user = await this.repository.findOneBy({ id });

        if (!user) {
            return null;
        }

        return toUser(user);
    }

    public async create(input: CreateUserDto): Promise<User> {
        const user = this.repository.create(input);
        const saved = await this.repository.save(user);

        return toUser(saved);
    }
}
