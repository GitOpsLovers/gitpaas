import { ProviderRegistrationsRepository } from '../../../domain/repositories/provider-registrations.repository';
import { RemoveExpiredProviderRegistrationsJob } from '../remove-expired-provider-registrations.job';

import type { AppLogger } from '@core/domain/ports/app-logger.port';

describe('RemoveExpiredProviderRegistrationsJob', () => {
    const now = new Date('2026-01-01T12:00:00.000Z');

    let rows: Array<{ id: string; expiresAt: Date }>;
    let mockRegistrationsRepository: jest.Mocked<Pick<ProviderRegistrationsRepository, 'deleteExpired'>>;
    let mockLogger: jest.Mocked<AppLogger>;
    let sut: RemoveExpiredProviderRegistrationsJob;

    beforeEach(() => {
        jest.clearAllMocks();
        jest.useFakeTimers().setSystemTime(now);

        rows = [
            { id: 'expired-1', expiresAt: new Date('2026-01-01T11:00:00.000Z') },
            { id: 'expired-2', expiresAt: new Date('2025-12-31T23:59:59.000Z') },
            { id: 'alive-1', expiresAt: new Date('2026-01-01T12:00:00.000Z') },
            { id: 'alive-2', expiresAt: new Date('2026-01-01T13:00:00.000Z') },
        ];

        mockRegistrationsRepository = {
            deleteExpired: jest.fn((moment: Date) => {
                const removed = rows.filter((row) => row.expiresAt.getTime() < moment.getTime());
                rows = rows.filter((row) => !removed.includes(row));

                return Promise.resolve(removed.length);
            }),
        };

        mockLogger = {
            debug: jest.fn(),
            log: jest.fn(),
            warn: jest.fn(),
            error: jest.fn(),
        };

        sut = new RemoveExpiredProviderRegistrationsJob(
            mockRegistrationsRepository as unknown as ProviderRegistrationsRepository,
            mockLogger,
        );
    });

    afterEach(() => {
        jest.useRealTimers();
    });

    describe('when rows passed the date of the end of their life', () => {
        it('removes those rows, and keeps the others', async () => {
            await sut.removeExpiredRegistrations();

            expect(rows.map((row) => row.id)).toEqual(['alive-1', 'alive-2']);
        });

        it('judges the removal against the current moment', async () => {
            await sut.removeExpiredRegistrations();

            expect(mockRegistrationsRepository.deleteExpired).toHaveBeenCalledTimes(1);
            expect(mockRegistrationsRepository.deleteExpired).toHaveBeenCalledWith(now);
        });

        it('reports the number of rows it removed', async () => {
            await sut.removeExpiredRegistrations();

            expect(mockLogger.log).toHaveBeenCalledTimes(1);
            expect(mockLogger.log).toHaveBeenCalledWith(
                'Removed 2 expired provider registration(s)',
                'RemoveExpiredProviderRegistrationsJob',
            );
        });
    });

    describe('when no row passed the date of the end of its life', () => {
        beforeEach(() => {
            rows = [{ id: 'alive-1', expiresAt: new Date('2026-01-01T13:00:00.000Z') }];
        });

        it('keeps every row', async () => {
            await sut.removeExpiredRegistrations();

            expect(rows.map((row) => row.id)).toEqual(['alive-1']);
        });

        it('reports nothing', async () => {
            await sut.removeExpiredRegistrations();

            expect(mockLogger.log).not.toHaveBeenCalled();
        });
    });
});
