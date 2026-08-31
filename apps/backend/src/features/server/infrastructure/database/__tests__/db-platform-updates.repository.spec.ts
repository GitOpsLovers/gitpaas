import { LessThan, Repository } from 'typeorm';

import { UPDATE_INITIAL_STEP } from '../../../domain/constants/platform-update.constants';
import { DbPlatformUpdateEntity } from '../db-platform-update.entity';
import { DatabasePlatformUpdatesRepository } from '../db-platform-updates.repository';

/** Builds a platform update database-entity fixture, overriding only the fields under test. */
const updateEntity = (overrides: Partial<DbPlatformUpdateEntity> = {}): DbPlatformUpdateEntity => ({
    id: 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d',
    targetVersion: 'v2.2.0',
    step: UPDATE_INITIAL_STEP,
    percent: 0,
    state: 'running',
    error: null,
    startedAt: new Date('2026-08-28T10:00:00.000Z'),
    ...overrides,
});

describe('DatabasePlatformUpdatesRepository', () => {
    let mockRepository: jest.Mocked<Pick<Repository<DbPlatformUpdateEntity>, 'findOne' | 'save' | 'update'>>;
    let sut: DatabasePlatformUpdatesRepository;

    beforeEach(() => {
        jest.clearAllMocks();

        mockRepository = { findOne: jest.fn(), save: jest.fn(), update: jest.fn() };
        sut = new DatabasePlatformUpdatesRepository(
            mockRepository as unknown as Repository<DbPlatformUpdateEntity>,
        );
    });

    describe('findLast', () => {
        it('reads the update that started last, and maps it to the shape of the API', async () => {
            mockRepository.findOne.mockResolvedValue(updateEntity({ percent: 60, step: 'Pulling ...' }));

            const result = await sut.findLast();

            expect(mockRepository.findOne).toHaveBeenCalledTimes(1);
            expect(mockRepository.findOne).toHaveBeenCalledWith({ where: {}, order: { startedAt: 'DESC' } });
            expect(result).toEqual({
                id: 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d',
                targetVersion: 'v2.2.0',
                step: 'Pulling ...',
                percent: 60,
                state: 'running',
                error: null,
                startedAt: '2026-08-28T10:00:00.000Z',
            });
        });

        it('returns null while the platform ran no update', async () => {
            mockRepository.findOne.mockResolvedValue(null);

            expect(await sut.findLast()).toBeNull();
        });
    });

    describe('open', () => {
        it('writes a row that runs, on the first step and at no progress', async () => {
            mockRepository.save.mockResolvedValue(updateEntity());

            await sut.open('v2.2.0');

            expect(mockRepository.save).toHaveBeenCalledTimes(1);
            expect(mockRepository.save).toHaveBeenCalledWith({
                targetVersion: 'v2.2.0',
                step: UPDATE_INITIAL_STEP,
                percent: 0,
                state: 'running',
                error: null,
            });
        });

        it('returns the update the row holds', async () => {
            mockRepository.save.mockResolvedValue(updateEntity());

            const result = await sut.open('v2.2.0');

            expect(result).toEqual({
                id: 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d',
                targetVersion: 'v2.2.0',
                step: UPDATE_INITIAL_STEP,
                percent: 0,
                state: 'running',
                error: null,
                startedAt: '2026-08-28T10:00:00.000Z',
            });
        });
    });

    describe('fail', () => {
        it('writes the failed state and the reason on the row of the update', async () => {
            mockRepository.update.mockResolvedValue({ affected: 1, raw: [], generatedMaps: [] });

            await sut.fail('a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d', 'the daemon refused the container');

            expect(mockRepository.update).toHaveBeenCalledTimes(1);
            expect(mockRepository.update).toHaveBeenCalledWith(
                { id: 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d' },
                { state: 'failed', error: 'the daemon refused the container' },
            );
        });
    });

    describe('failStale', () => {
        const startedBefore = new Date('2026-08-28T09:45:00.000Z');

        it('closes every row that still runs and that started before the moment', async () => {
            mockRepository.update.mockResolvedValue({ affected: 2, raw: [], generatedMaps: [] });

            await sut.failStale(startedBefore, 'the update left no report');

            expect(mockRepository.update).toHaveBeenCalledTimes(1);
            expect(mockRepository.update).toHaveBeenCalledWith(
                { state: 'running', startedAt: LessThan(startedBefore) },
                { state: 'failed', error: 'the update left no report' },
            );
        });

        it('returns the number of rows the write closed', async () => {
            mockRepository.update.mockResolvedValue({ affected: 2, raw: [], generatedMaps: [] });

            expect(await sut.failStale(startedBefore, 'the update left no report')).toBe(2);
        });

        it('returns zero while the write reported no row', async () => {
            mockRepository.update.mockResolvedValue({ affected: undefined, raw: [], generatedMaps: [] });

            expect(await sut.failStale(startedBefore, 'the update left no report')).toBe(0);
        });
    });
});
