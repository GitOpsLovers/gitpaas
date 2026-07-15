import { AppController } from './app.controller';
import { AppService } from './app.service';
import type { HealthStatus } from './app.service';

const healthStatus: HealthStatus = { status: 'ok' };

describe('AppController', () => {
    let service: jest.Mocked<Pick<AppService, 'getHealth'>>;
    let sut: AppController;

    beforeEach(() => {
        service = {
            getHealth: jest.fn(),
        };

        sut = new AppController(service);
    });

    describe('getHealth', () => {
        it('delegates to the service to resolve the health status', () => {
            service.getHealth.mockReturnValue(healthStatus);

            sut.getHealth();

            expect(service.getHealth).toHaveBeenCalledTimes(1);
            expect(service.getHealth).toHaveBeenCalledWith();
        });

        it('returns the ok health status produced by the service', () => {
            service.getHealth.mockReturnValue(healthStatus);

            const result = sut.getHealth();

            expect(result).toEqual({ status: 'ok' });
        });

        it('returns the exact object reference produced by the service', () => {
            service.getHealth.mockReturnValue(healthStatus);

            const result = sut.getHealth();

            expect(result).toBe(healthStatus);
        });

        it('rethrows an error raised by the service unchanged', () => {
            const original = new Error('health check failed');
            service.getHealth.mockImplementation(() => {
                throw original;
            });

            expect(() => sut.getHealth()).toThrow(original);
        });
    });
});
