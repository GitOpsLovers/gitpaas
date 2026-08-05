import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { CreateRefreshTokenDto } from '../../domain/dtos/create-refresh-token.dto';
import { RefreshToken } from '../../domain/models/refresh-token.models';
import { RefreshTokensRepository } from '../../domain/repositories/refresh-tokens.repository';

import { RefreshTokenDbEntity } from './db-refresh-token.entity';
import { toRefreshToken } from './db-refresh-tokens.transformer';

/**
 * Refresh tokens database repository
 */
@Injectable()
export class DatabaseRefreshTokensRepository implements RefreshTokensRepository {
    constructor(
        @InjectRepository(RefreshTokenDbEntity)
        private readonly repository: Repository<RefreshTokenDbEntity>,
    ) {}

    /**
     * Persists a freshly issued refresh token
     *
     * @param input Refresh token data (with an already-hashed token)
     *
     * @returns Created refresh token record
     */
    public async create(input: CreateRefreshTokenDto): Promise<RefreshToken> {
        const token = this.repository.create(input);
        const saved = await this.repository.save(token);

        return toRefreshToken(saved);
    }

    /**
     * Finds a single refresh token record by its `jti` claim
     *
     * @param jti Token identifier
     *
     * @returns Refresh token record, or `null` when it does not exist
     */
    public async findByJti(jti: string): Promise<RefreshToken | null> {
        const token = await this.repository.findOneBy({ jti });

        if (!token) {
            return null;
        }

        return toRefreshToken(token);
    }

    /**
     * Revokes a single refresh token record
     *
     * @param id Refresh token record id
     *
     * @returns `true` when a row was revoked, `false` otherwise
     */
    public async revoke(id: string): Promise<boolean> {
        const result = await this.repository.update({ id }, { revoked: true });

        return (result.affected ?? 0) > 0;
    }

    /**
     * Revokes every refresh token belonging to a user
     *
     * @param userId User id
     *
     * @returns Number of tokens revoked
     */
    public async revokeAllForUser(userId: string): Promise<number> {
        const result = await this.repository.update({ userId, revoked: false }, { revoked: true });

        return result.affected ?? 0;
    }
}
