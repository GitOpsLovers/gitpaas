import type { AppLogger } from '../../../domain/ports/app-logger.port';
import { DiagnosticLoggerService } from '../diagnostic-logger.service';

describe('DiagnosticLoggerService', () => {
    let mockLogger: jest.Mocked<AppLogger>;
    let sut: DiagnosticLoggerService;

    beforeEach(() => {
        jest.clearAllMocks();

        mockLogger = { debug: jest.fn(), log: jest.fn(), warn: jest.fn(), error: jest.fn() };
        sut = new DiagnosticLoggerService(mockLogger);
    });

    it('forwards log messages with their context', () => {
        sut.log('up', 'Ctx');

        expect(mockLogger.log).toHaveBeenCalledWith('up', 'Ctx');
    });

    it('forwards warn messages with their context', () => {
        sut.warn('careful', 'Ctx');

        expect(mockLogger.warn).toHaveBeenCalledWith('careful', 'Ctx');
    });

    it('forwards error messages with their trace and context', () => {
        const error = new Error('boom');

        sut.error('failed', error, 'Ctx');

        expect(mockLogger.error).toHaveBeenCalledWith('failed', error, 'Ctx');
    });

    it('keeps the optional arguments undefined instead of defaulting them', () => {
        sut.log('up');
        sut.warn('careful');
        sut.error('failed');

        expect(mockLogger.log).toHaveBeenCalledWith('up', undefined);
        expect(mockLogger.warn).toHaveBeenCalledWith('careful', undefined);
        expect(mockLogger.error).toHaveBeenCalledWith('failed', undefined, undefined);
    });

    it('forwards a non-Error trace value unchanged', () => {
        const trace = { code: 'E_BOOM' };

        sut.error('failed', trace, 'Ctx');

        expect(mockLogger.error).toHaveBeenCalledWith('failed', trace, 'Ctx');
        expect((mockLogger.error as jest.Mock).mock.calls[0][1]).toBe(trace);
    });

    it('delegates once per call and never to another level', () => {
        sut.log('up', 'Ctx');

        expect(mockLogger.log).toHaveBeenCalledTimes(1);
        expect(mockLogger.debug).not.toHaveBeenCalled();
        expect(mockLogger.warn).not.toHaveBeenCalled();
        expect(mockLogger.error).not.toHaveBeenCalled();
    });
});
