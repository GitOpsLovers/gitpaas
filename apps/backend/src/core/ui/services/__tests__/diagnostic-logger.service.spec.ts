import { Logger } from '@nestjs/common';

import { DiagnosticLoggerService } from '../diagnostic-logger.service';

describe('DiagnosticLoggerService', () => {
    let sut: DiagnosticLoggerService;
    let logSpy: jest.SpyInstance;
    let warnSpy: jest.SpyInstance;
    let errorSpy: jest.SpyInstance;

    beforeEach(() => {
        jest.clearAllMocks();
        logSpy = jest.spyOn(Logger.prototype, 'log').mockImplementation();
        warnSpy = jest.spyOn(Logger.prototype, 'warn').mockImplementation();
        errorSpy = jest.spyOn(Logger.prototype, 'error').mockImplementation();
        sut = new DiagnosticLoggerService();
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    it('forwards log messages with their context', () => {
        sut.log('up', 'Ctx');

        expect(logSpy).toHaveBeenCalledWith('up', 'Ctx');
    });

    it('forwards warn messages with their context', () => {
        sut.warn('careful', 'Ctx');

        expect(warnSpy).toHaveBeenCalledWith('careful', 'Ctx');
    });

    it('forwards error messages with their trace and context', () => {
        const error = new Error('boom');
        sut.error('failed', error, 'Ctx');

        expect(errorSpy).toHaveBeenCalledWith('failed', error, 'Ctx');
    });
});
