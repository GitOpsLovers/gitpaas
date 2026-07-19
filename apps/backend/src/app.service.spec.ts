import { Test } from '@nestjs/testing';

import { AppService } from './app.service';
import type { HealthStatus } from './app.service';

describe('AppService', () => {
    let sut: AppService;

    beforeEach(async () => {
        jest.clearAllMocks();

        const moduleRef = await Test.createTestingModule({
            providers: [AppService],
        }).compile();

        sut = moduleRef.get(AppService);
    });

    describe('getHealth', () => {
        it('returns the ok health status', () => {
            const result = sut.getHealth();

            expect(result).toEqual({ status: 'ok' });
        });

        it('returns a status of exactly "ok"', () => {
            const result: HealthStatus = sut.getHealth();

            expect(result.status).toBe('ok');
        });

        it('returns a payload with only the status property', () => {
            const result = sut.getHealth();

            expect(Object.keys(result)).toEqual(['status']);
        });

        it('produces a fresh object on each call', () => {
            const first = sut.getHealth();
            const second = sut.getHealth();

            expect(first).toEqual(second);
            expect(first).not.toBe(second);
        });

        it('is a pure call that never throws', () => {
            expect(() => sut.getHealth()).not.toThrow();
        });
    });
});
