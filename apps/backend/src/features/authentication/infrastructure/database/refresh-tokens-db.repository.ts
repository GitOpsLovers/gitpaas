import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { CreateRefreshTokenDto } from '../../domain/dtos/create-refresh-token.dto';
import { RefreshToken } from '../../domain/models/refresh-token.model';
import { RefreshTokensRepository } from '../../domain/repositories/refresh-tokens.repository';

import { RefreshTokenDbEntity } from './refresh-token-db.entity';
import { toRefreshToken } from './refresh-tokens-db.transformer';

/**
 * Refresh tokens database repository
 */
@Injectable()
export class RefreshTokensDatabaseRepository implements RefreshTokensRepository {
    constructor(
        @InjectRepository(RefreshTokenDbEntity)
        private readonly repository: Repository<RefreshTokenDbEntity>,
    ) {}

    public async create(input: CreateRefreshTokenDto): Promise<RefreshToken> {
        const token = this.repository.create(input);
        const saved = await this.repository.save(token);

        return toRefreshToken(saved);
    }

    public async findByJti(jti: string): Promise<RefreshToken | null> {
        const token = await this.repository.findOneBy({ jti });

        if (!token) {
            return null;
        }

        return toRefreshToken(token);
    }

    public async revoke(id: string): Promise<boolean> {
        const result = await this.repository.update({ id }, { revoked: true });

        return (result.affected ?? 0) > 0;
    }

    public async revokeAllForUser(userId: string): Promise<number> {
        const result = await this.repository.update({ userId, revoked: false }, { revoked: true });

        return result.affected ?? 0;
    }
}
