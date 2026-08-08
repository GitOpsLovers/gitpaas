import { Logger as NestLogger } from '@nestjs/common';

import { NestLoggerAdapter } from '../nest-logger.adapter';

describe('NestLoggerAdapter', () => {
    let sut: NestLoggerAdapter;
    let debugSpy: jest.SpyInstance;
    let logSpy: jest.SpyInstance;
    let warnSpy: jest.SpyInstance;
    let errorSpy: jest.SpyInstance;

    beforeEach(() => {
        jest.clearAllMocks();
        debugSpy = jest.spyOn(NestLogger.prototype, 'debug').mockImplementation();
        logSpy = jest.spyOn(NestLogger.prototype, 'log').mockImplementation();
        warnSpy = jest.spyOn(NestLogger.prototype, 'warn').mockImplementation();
        errorSpy = jest.spyOn(NestLogger.prototype, 'error').mockImplementation();
        sut = new NestLoggerAdapter();
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    it('forwards debug messages with their context', () => {
        sut.debug('detail', 'Ctx');

        expect(debugSpy).toHaveBeenCalledWith('detail', 'Ctx');
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

    it('omits the context when none is provided', () => {
        sut.log('up');

        expect(logSpy).toHaveBeenCalledWith('up', undefined);
    });

    it('omits the context on debug and warn when none is provided', () => {
        sut.debug('detail');
        sut.warn('careful');

        expect(debugSpy).toHaveBeenCalledWith('detail', undefined);
        expect(warnSpy).toHaveBeenCalledWith('careful', undefined);
    });

    it('forwards an error without a trace or a context', () => {
        sut.error('failed');

        expect(errorSpy).toHaveBeenCalledWith('failed', undefined, undefined);
    });

    it('forwards an error trace without a context', () => {
        const error = new Error('boom');

        sut.error('failed', error);

        expect(errorSpy).toHaveBeenCalledWith('failed', error, undefined);
    });

    it('forwards each message exactly once and never to another level', () => {
        sut.log('up', 'Ctx');

        expect(logSpy).toHaveBeenCalledTimes(1);
        expect(debugSpy).not.toHaveBeenCalled();
        expect(warnSpy).not.toHaveBeenCalled();
        expect(errorSpy).not.toHaveBeenCalled();
    });
});
