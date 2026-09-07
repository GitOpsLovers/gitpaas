import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, MoreThan, Repository } from 'typeorm';

import { CreateRefreshTokenDto } from '../../domain/dtos/create-refresh-token.dto';
import { RefreshToken } from '../../domain/models/refresh-token.models';
import { RefreshTokensRepository } from '../../domain/repositories/refresh-tokens.repository';

import { DbRefreshTokenEntity } from './db-refresh-token.entity';
import { toRefreshToken } from './db-refresh-tokens.transformer';

/**
 * Refresh tokens database repository
 */
@Injectable()
export class DatabaseRefreshTokensRepository implements RefreshTokensRepository {
    constructor(
        @InjectRepository(DbRefreshTokenEntity)
        private readonly repository: Repository<DbRefreshTokenEntity>,
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

    public async revokeMany(ids: string[]): Promise<number> {
        if (ids.length === 0) {
            return 0;
        }

        const result = await this.repository.update({ id: In(ids) }, { revoked: true });

        return result.affected ?? 0;
    }

    public async revokeFamily(familyId: string): Promise<number> {
        const result = await this.repository.update({ familyId, revoked: false }, { revoked: true });

        return result.affected ?? 0;
    }

    public async revokeAllForUser(userId: string): Promise<number> {
        const result = await this.repository.update({ userId, revoked: false }, { revoked: true });

        return result.affected ?? 0;
    }

    public async findActiveForUser(userId: string): Promise<RefreshToken[]> {
        const tokens = await this.repository.find({
            where: { userId, revoked: false, expiresAt: MoreThan(new Date()) },
            order: { createdAt: 'ASC' },
        });

        return tokens.map(toRefreshToken);
    }
}
