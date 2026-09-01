import { Repository } from 'typeorm';

import { DbPlatformSettingsEntity, PLATFORM_SETTINGS_ROW_ID } from '../db-platform-settings.entity';
import { DatabasePlatformSettingsRepository } from '../db-platform-settings.repository';

/** Builds a platform settings database-entity fixture, overriding only the fields under test. */
const settingsEntity = (overrides: Partial<DbPlatformSettingsEntity> = {}): DbPlatformSettingsEntity => ({
    id: PLATFORM_SETTINGS_ROW_ID,
    logRetentionDays: 30,
    gitpaasDomain: null,
    publicHostAddress: null,
    updatedAt: new Date('2026-08-21T00:00:00.000Z'),
    ...overrides,
});

describe('DatabasePlatformSettingsRepository', () => {
    let mockRepository: jest.Mocked<Pick<Repository<DbPlatformSettingsEntity>, 'findOneBy' | 'save'>>;
    let sut: DatabasePlatformSettingsRepository;

    beforeEach(() => {
        jest.clearAllMocks();

        mockRepository = { findOneBy: jest.fn(), save: jest.fn() };
        sut = new DatabasePlatformSettingsRepository(
            mockRepository as unknown as Repository<DbPlatformSettingsEntity>,
        );
    });

    describe('find', () => {
        it('reads the single row of the settings and maps it to domain', async () => {
            mockRepository.findOneBy.mockResolvedValue(settingsEntity({ logRetentionDays: 90 }));

            const result = await sut.find();

            expect(mockRepository.findOneBy).toHaveBeenCalledTimes(1);
            expect(mockRepository.findOneBy).toHaveBeenCalledWith({ id: PLATFORM_SETTINGS_ROW_ID });
            expect(result).toEqual({ logRetentionDays: 90 });
        });

        it('returns null when the operator saved no row', async () => {
            mockRepository.findOneBy.mockResolvedValue(null);

            expect(await sut.find()).toBeNull();
        });
    });

    describe('save', () => {
        it('writes the parameters into the single row of the settings', async () => {
            mockRepository.save.mockResolvedValue(settingsEntity({ logRetentionDays: 45 }));

            const result = await sut.save({ logRetentionDays: 45 });

            expect(mockRepository.save).toHaveBeenCalledTimes(1);
            expect(mockRepository.save).toHaveBeenCalledWith({
                id: PLATFORM_SETTINGS_ROW_ID,
                logRetentionDays: 45,
                gitpaasDomain: null,
                publicHostAddress: null,
            });
            expect(result).toEqual({ logRetentionDays: 45 });
        });

        it('writes the host of the control plane into the column of the row', async () => {
            mockRepository.save.mockResolvedValue(
                settingsEntity({ logRetentionDays: 45, gitpaasDomain: 'gitpaas.example.com' }),
            );

            const result = await sut.save({ logRetentionDays: 45, gitpaasDomain: 'gitpaas.example.com' });

            expect(mockRepository.save).toHaveBeenCalledWith({
                id: PLATFORM_SETTINGS_ROW_ID,
                logRetentionDays: 45,
                gitpaasDomain: 'gitpaas.example.com',
                publicHostAddress: null,
            });
            expect(result.gitpaasDomain).toBe('gitpaas.example.com');
        });

        it('writes the public address of the host into the column of the row', async () => {
            mockRepository.save.mockResolvedValue(
                settingsEntity({ logRetentionDays: 45, publicHostAddress: '203.0.113.10' }),
            );

            const result = await sut.save({ logRetentionDays: 45, publicHostAddress: '203.0.113.10' });

            expect(mockRepository.save).toHaveBeenCalledWith({
                id: PLATFORM_SETTINGS_ROW_ID,
                logRetentionDays: 45,
                gitpaasDomain: null,
                publicHostAddress: '203.0.113.10',
            });
            expect(result.publicHostAddress).toBe('203.0.113.10');
        });

        it('empties the column of the public address of the host when the parameters carry none', async () => {
            mockRepository.save.mockResolvedValue(settingsEntity({ logRetentionDays: 45 }));

            await sut.save({ logRetentionDays: 45 });

            expect(mockRepository.save).toHaveBeenCalledWith(
                expect.objectContaining({ publicHostAddress: null }),
            );
        });

        it('empties the column of the host when the parameters carry none', async () => {
            mockRepository.save.mockResolvedValue(settingsEntity({ logRetentionDays: 45 }));

            await sut.save({ logRetentionDays: 45 });

            expect(mockRepository.save).toHaveBeenCalledWith(
                expect.objectContaining({ gitpaasDomain: null }),
            );
        });

        it('propagates errors thrown by the underlying repository', async () => {
            const error = new Error('connection terminated');
            mockRepository.save.mockRejectedValue(error);

            await expect(sut.save({ logRetentionDays: 45 })).rejects.toThrow(error);
        });
    });
});
