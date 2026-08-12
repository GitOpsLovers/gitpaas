import { bootstrap } from '../bootstrap';

const mockLoggerError = jest.fn();

jest.mock('../bootstrap', () => ({
    bootstrap: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('@core/infrastructure/logging/nest-logger.adapter', () => ({
    NestLoggerAdapter: jest.fn().mockImplementation(() => ({
        debug: jest.fn(),
        log: jest.fn(),
        warn: jest.fn(),
        error: mockLoggerError,
    })),
}));

const mockBootstrap = bootstrap as jest.Mock;

type ProcessHandler = (value: unknown) => void;

/** Resolves after pending microtasks, letting the bootstrap chain settle. */
const flush = (): Promise<void> =>
    new Promise<void>((resolve) => {
        setImmediate(resolve);
    });

/**
 * Loads `main.ts` in isolation, capturing the process handlers it registers.
 *
 * @returns The registered handlers, keyed by event name
 */
function loadMain(): Map<string, ProcessHandler> {
    const handlers = new Map<string, ProcessHandler>();

    const onSpy = jest.spyOn(process, 'on').mockImplementation(((event: string, handler: ProcessHandler) => {
        handlers.set(event, handler);

        return process;
    }) as never);

    jest.isolateModules(() => {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        require('../main');
    });

    onSpy.mockRestore();

    return handlers;
}

describe('main (main.ts)', () => {
    let exitSpy: jest.SpyInstance;

    beforeEach(() => {
        jest.clearAllMocks();
        mockBootstrap.mockResolvedValue(undefined);
        exitSpy = jest.spyOn(process, 'exit').mockImplementation((() => undefined) as never);
    });

    afterEach(() => {
        exitSpy.mockRestore();
    });

    it('bootstraps the application', () => {
        loadMain();

        expect(mockBootstrap).toHaveBeenCalledTimes(1);
    });

    it('registers the process level handlers', () => {
        const handlers = loadMain();

        expect(handlers.has('unhandledRejection')).toBe(true);
        expect(handlers.has('uncaughtException')).toBe(true);
    });

    it('logs an unhandled rejection through the application logger without exiting', () => {
        const handlers = loadMain();

        handlers.get('unhandledRejection')?.(new Error('boom'));

        expect(mockLoggerError).toHaveBeenCalledWith(
            'Unhandled promise rejection: boom',
            expect.any(Error),
            'Process',
        );
        expect(exitSpy).not.toHaveBeenCalled();
    });

    it('logs a non-error rejection reason', () => {
        const handlers = loadMain();

        handlers.get('unhandledRejection')?.('nope');

        expect(mockLoggerError).toHaveBeenCalledWith('Unhandled promise rejection: nope', 'nope', 'Process');
    });

    it('logs an uncaught exception and stops the process', () => {
        const handlers = loadMain();

        handlers.get('uncaughtException')?.(new Error('fatal'));

        expect(mockLoggerError).toHaveBeenCalledWith(
            'Uncaught exception: fatal',
            expect.any(Error),
            'Process',
        );
        expect(exitSpy).toHaveBeenCalledWith(1);
    });

    it('logs a failed bootstrap and stops the process', async () => {
        mockBootstrap.mockRejectedValue(new Error('no database'));

        loadMain();
        await flush();

        expect(mockLoggerError).toHaveBeenCalledWith(
            'Failed to bootstrap the application: no database',
            expect.any(Error),
            'Process',
        );
        expect(exitSpy).toHaveBeenCalledWith(1);
    });
});
