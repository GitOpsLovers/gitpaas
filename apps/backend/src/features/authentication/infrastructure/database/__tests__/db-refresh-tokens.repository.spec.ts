import { In, MoreThan, Repository } from 'typeorm';

import { CreateRefreshTokenDto } from '../../../domain/dtos/create-refresh-token.dto';
import { DbRefreshTokenEntity } from '../db-refresh-token.entity';
import { DatabaseRefreshTokensRepository } from '../db-refresh-tokens.repository';

/**
 * Builds a refresh-token database-entity fixture, overriding only the fields under test.
 */
const tokenEntity = (overrides: Partial<DbRefreshTokenEntity> = {}): DbRefreshTokenEntity => ({
    id: 'record-1',
    userId: '3f2504e0-4f89-41d3-9a0c-0305e82c3301',
    jti: 'b1a2c3d4-0000-0000-0000-000000000000',
    familyId: 'f1a2c3d4-0000-0000-0000-000000000000',
    tokenHash: 'sha256-hash',
    expiresAt: new Date('2026-07-18T00:00:00.000Z'),
    revoked: false,
    createdAt: new Date('2026-07-11T00:00:00.000Z'),
    updatedAt: new Date('2026-07-11T00:00:00.000Z'),
    ...overrides,
});

describe('DatabaseRefreshTokensRepository', () => {
    let mockRepository: jest.Mocked<
        Pick<Repository<DbRefreshTokenEntity>, 'create' | 'save' | 'findOneBy' | 'find' | 'update'>
    >;
    let sut: DatabaseRefreshTokensRepository;

    beforeEach(() => {
        jest.clearAllMocks();

        mockRepository = {
            create: jest.fn(),
            save: jest.fn(),
            findOneBy: jest.fn(),
            find: jest.fn(),
            update: jest.fn(),
        };
        sut = new DatabaseRefreshTokensRepository(
            mockRepository as unknown as Repository<DbRefreshTokenEntity>,
        );
    });

    describe('create', () => {
        it('creates and saves the record then returns the mapped domain model', async () => {
            const input: CreateRefreshTokenDto = {
                userId: '3f2504e0-4f89-41d3-9a0c-0305e82c3301',
                jti: 'b1a2c3d4-0000-0000-0000-000000000000',
                familyId: 'f1a2c3d4-0000-0000-0000-000000000000',
                tokenHash: 'sha256-hash',
                expiresAt: new Date('2026-07-18T00:00:00.000Z'),
            };
            const entity = tokenEntity();
            mockRepository.create.mockReturnValue(entity);
            mockRepository.save.mockResolvedValue(entity);

            const result = await sut.create(input);

            expect(mockRepository.create).toHaveBeenCalledWith(input);
            expect(mockRepository.save).toHaveBeenCalledWith(entity);
            expect(result.jti).toBe(input.jti);
            expect(result.tokenHash).toBe(input.tokenHash);
        });
    });

    describe('findByJti', () => {
        it('finds a record by jti and maps it into the domain model', async () => {
            const entity = tokenEntity();
            mockRepository.findOneBy.mockResolvedValue(entity);

            const result = await sut.findByJti(entity.jti);

            expect(mockRepository.findOneBy).toHaveBeenCalledWith({ jti: entity.jti });
            expect(result?.id).toBe(entity.id);
        });

        it('returns null when no record matches the jti', async () => {
            mockRepository.findOneBy.mockResolvedValue(null);

            expect(await sut.findByJti('missing')).toBeNull();
        });
    });

    describe('revoke', () => {
        it('flags the record revoked and reports true when a row was affected', async () => {
            mockRepository.update.mockResolvedValue({ affected: 1, raw: [], generatedMaps: [] });

            const result = await sut.revoke('record-1');

            expect(mockRepository.update).toHaveBeenCalledWith({ id: 'record-1' }, { revoked: true });
            expect(result).toBe(true);
        });

        it('reports false when no row was affected', async () => {
            mockRepository.update.mockResolvedValue({ affected: 0, raw: [], generatedMaps: [] });

            expect(await sut.revoke('record-1')).toBe(false);
        });

        it('treats an undefined affected count as no rows revoked', async () => {
            mockRepository.update.mockResolvedValue({ raw: [], generatedMaps: [] });

            expect(await sut.revoke('record-1')).toBe(false);
        });
    });

    describe('revokeMany', () => {
        it('revokes every named record and returns the affected count', async () => {
            mockRepository.update.mockResolvedValue({ affected: 2, raw: [], generatedMaps: [] });

            const result = await sut.revokeMany(['record-1', 'record-2']);

            expect(mockRepository.update).toHaveBeenCalledWith(
                { id: In(['record-1', 'record-2']) },
                { revoked: true },
            );
            expect(result).toBe(2);
        });

        it('never touches the database when the list of ids is empty', async () => {
            const result = await sut.revokeMany([]);

            expect(mockRepository.update).not.toHaveBeenCalled();
            expect(result).toBe(0);
        });

        it('returns zero when the affected count is undefined', async () => {
            mockRepository.update.mockResolvedValue({ raw: [], generatedMaps: [] });

            expect(await sut.revokeMany(['record-1'])).toBe(0);
        });
    });

    describe('revokeFamily', () => {
        it('revokes every live token of the family and returns the affected count', async () => {
            mockRepository.update.mockResolvedValue({ affected: 4, raw: [], generatedMaps: [] });

            const result = await sut.revokeFamily('family-1');

            expect(mockRepository.update).toHaveBeenCalledWith(
                { familyId: 'family-1', revoked: false },
                { revoked: true },
            );
            expect(result).toBe(4);
        });

        it('returns zero when the affected count is undefined', async () => {
            mockRepository.update.mockResolvedValue({ raw: [], generatedMaps: [] });

            expect(await sut.revokeFamily('family-1')).toBe(0);
        });
    });

    describe('findActiveForUser', () => {
        it('asks for the live tokens of the user, oldest first, and maps them', async () => {
            const entity = tokenEntity();
            mockRepository.find.mockResolvedValue([entity]);

            const result = await sut.findActiveForUser('user-1');

            expect(mockRepository.find).toHaveBeenCalledWith({
                where: { userId: 'user-1', revoked: false, expiresAt: MoreThan(expect.any(Date)) },
                order: { createdAt: 'ASC' },
            });
            expect(result).toEqual([expect.objectContaining({ id: entity.id, familyId: entity.familyId })]);
        });

        it('returns an empty list when the user holds no live token', async () => {
            mockRepository.find.mockResolvedValue([]);

            expect(await sut.findActiveForUser('user-1')).toEqual([]);
        });
    });

    describe('revokeAllForUser', () => {
        it('revokes every non-revoked token for the user and returns the affected count', async () => {
            mockRepository.update.mockResolvedValue({ affected: 3, raw: [], generatedMaps: [] });

            const result = await sut.revokeAllForUser('user-1');

            expect(mockRepository.update).toHaveBeenCalledWith(
                { userId: 'user-1', revoked: false },
                { revoked: true },
            );
            expect(result).toBe(3);
        });

        it('returns zero when the affected count is undefined', async () => {
            mockRepository.update.mockResolvedValue({ raw: [], generatedMaps: [] });

            expect(await sut.revokeAllForUser('user-1')).toBe(0);
        });
    });
});
