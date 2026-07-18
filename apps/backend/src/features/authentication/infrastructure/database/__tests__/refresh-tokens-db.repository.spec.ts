import { Repository } from 'typeorm';

import { CreateRefreshTokenDto } from '../../../domain/dtos/create-refresh-token.dto';
import { RefreshTokenDbEntity } from '../refresh-token-db.entity';
import { RefreshTokensDatabaseRepository } from '../refresh-tokens-db.repository';

function tokenEntity(overrides: Partial<RefreshTokenDbEntity> = {}): RefreshTokenDbEntity {
    return {
        id: 'record-1',
        userId: '3f2504e0-4f89-41d3-9a0c-0305e82c3301',
        jti: 'b1a2c3d4-0000-0000-0000-000000000000',
        tokenHash: 'sha256-hash',
        expiresAt: new Date('2026-07-18T00:00:00.000Z'),
        revoked: false,
        createdAt: new Date('2026-07-11T00:00:00.000Z'),
        updatedAt: new Date('2026-07-11T00:00:00.000Z'),
        ...overrides,
    };
}

describe('RefreshTokensDatabaseRepository', () => {
    let mockRepo: {
        create: jest.Mock;
        save: jest.Mock;
        findOneBy: jest.Mock;
        update: jest.Mock;
    };
    let repository: RefreshTokensDatabaseRepository;

    beforeEach(() => {
        mockRepo = {
            create: jest.fn(),
            save: jest.fn(),
            findOneBy: jest.fn(),
            update: jest.fn(),
        };
        repository = new RefreshTokensDatabaseRepository(mockRepo as unknown as Repository<RefreshTokenDbEntity>);
    });

    describe('create', () => {
        it('creates and saves the record then returns the mapped domain model', async () => {
            const input: CreateRefreshTokenDto = {
                userId: '3f2504e0-4f89-41d3-9a0c-0305e82c3301',
                jti: 'b1a2c3d4-0000-0000-0000-000000000000',
                tokenHash: 'sha256-hash',
                expiresAt: new Date('2026-07-18T00:00:00.000Z'),
            };
            const entity = tokenEntity();
            mockRepo.create.mockReturnValue(entity);
            mockRepo.save.mockResolvedValue(entity);

            const result = await repository.create(input);

            expect(mockRepo.create).toHaveBeenCalledWith(input);
            expect(mockRepo.save).toHaveBeenCalledWith(entity);
            expect(result.jti).toBe(input.jti);
            expect(result.tokenHash).toBe(input.tokenHash);
        });
    });

    describe('findByJti', () => {
        it('finds a record by jti and maps it into the domain model', async () => {
            const entity = tokenEntity();
            mockRepo.findOneBy.mockResolvedValue(entity);

            const result = await repository.findByJti(entity.jti);

            expect(mockRepo.findOneBy).toHaveBeenCalledWith({ jti: entity.jti });
            expect(result?.id).toBe(entity.id);
        });

        it('returns null when no record matches the jti', async () => {
            mockRepo.findOneBy.mockResolvedValue(null);

            expect(await repository.findByJti('missing')).toBeNull();
        });
    });

    describe('revoke', () => {
        it('flags the record revoked and reports true when a row was affected', async () => {
            mockRepo.update.mockResolvedValue({ affected: 1 });

            const result = await repository.revoke('record-1');

            expect(mockRepo.update).toHaveBeenCalledWith({ id: 'record-1' }, { revoked: true });
            expect(result).toBe(true);
        });

        it('reports false when no row was affected', async () => {
            mockRepo.update.mockResolvedValue({ affected: 0 });

            expect(await repository.revoke('record-1')).toBe(false);
        });

        it('treats an undefined affected count as no rows revoked', async () => {
            mockRepo.update.mockResolvedValue({});

            expect(await repository.revoke('record-1')).toBe(false);
        });
    });

    describe('revokeAllForUser', () => {
        it('revokes every non-revoked token for the user and returns the affected count', async () => {
            mockRepo.update.mockResolvedValue({ affected: 3 });

            const result = await repository.revokeAllForUser('user-1');

            expect(mockRepo.update).toHaveBeenCalledWith({ userId: 'user-1', revoked: false }, { revoked: true });
            expect(result).toBe(3);
        });

        it('returns zero when the affected count is undefined', async () => {
            mockRepo.update.mockResolvedValue({});

            expect(await repository.revokeAllForUser('user-1')).toBe(0);
        });
    });
});
