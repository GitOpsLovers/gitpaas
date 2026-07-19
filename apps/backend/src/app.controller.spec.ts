import { Test } from '@nestjs/testing';

import { AppController } from './app.controller';
import { AppService } from './app.service';
import type { HealthStatus } from './app.service';

const healthStatus: HealthStatus = { status: 'ok' };

describe('AppController', () => {
    let mockAppService: jest.Mocked<Pick<AppService, 'getHealth'>>;
    let sut: AppController;

    beforeEach(async () => {
        jest.clearAllMocks();

        mockAppService = {
            getHealth: jest.fn(),
        };

        const moduleRef = await Test.createTestingModule({
            controllers: [AppController],
            providers: [{ provide: AppService, useValue: mockAppService }],
        }).compile();

        sut = moduleRef.get(AppController);
    });

    describe('getHealth', () => {
        it('delegates to the service to resolve the health status', () => {
            mockAppService.getHealth.mockReturnValue(healthStatus);

            sut.getHealth();

            expect(mockAppService.getHealth).toHaveBeenCalledTimes(1);
            expect(mockAppService.getHealth).toHaveBeenCalledWith();
        });

        it('returns the ok health status produced by the service', () => {
            mockAppService.getHealth.mockReturnValue(healthStatus);

            const result = sut.getHealth();

            expect(result).toEqual({ status: 'ok' });
        });

        it('returns the exact object reference produced by the service', () => {
            mockAppService.getHealth.mockReturnValue(healthStatus);

            const result = sut.getHealth();

            expect(result).toBe(healthStatus);
        });

        it('rethrows an error raised by the service unchanged', () => {
            const original = new Error('health check failed');
            mockAppService.getHealth.mockImplementation(() => {
                throw original;
            });

            expect(() => sut.getHealth()).toThrow(original);
        });
    });
});
