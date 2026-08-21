import type { ServerStatus } from '@gitpaas/contracts';

import { mapDaemonHealthUseCase } from './map-daemon-health.use-case';

const UNREACHABLE_MESSAGE = 'The server Docker daemon is not reachable.';

const UNREADABLE_MESSAGE = 'Could not read the state of the server Docker daemon.';

const status: ServerStatus = {
    connected: true,
    serverVersion: '25.0.3',
    operatingSystem: 'Debian GNU/Linux 12',
    containers: 7,
    images: 12,
};

const httpError = (statusCode: number, body: unknown): unknown => ({ status: statusCode, error: body });

const envelope = (code: string, message?: string): Record<string, unknown> => ({
    statusCode: 503,
    code,
    message: message ?? 'The Docker daemon did not answer.',
});

describe('mapDaemonHealthUseCase', () => {
    test('The daemon answers', () => {
        expect(mapDaemonHealthUseCase(status, undefined)).toEqual({
            state: 'reachable',
            info: status,
            message: null,
        });
    });

    test('The daemon does not answer', () => {
        const error = httpError(503, { statusCode: 503, code: 'DAEMON_UNREACHABLE' });

        expect(mapDaemonHealthUseCase(undefined, error)).toEqual({
            state: 'unreachable',
            info: null,
            message: UNREACHABLE_MESSAGE,
        });
    });

    test('shows the message the envelope of DAEMON_UNREACHABLE carries', () => {
        const error = httpError(503, envelope('DAEMON_UNREACHABLE'));

        expect(mapDaemonHealthUseCase(undefined, error)).toEqual({
            state: 'unreachable',
            info: null,
            message: 'The Docker daemon did not answer.',
        });
    });

    test('reads the code of the envelope and not the number of the status', () => {
        const error = httpError(500, envelope('DAEMON_UNREACHABLE', 'It went away.'));

        expect(mapDaemonHealthUseCase(undefined, error)).toEqual({
            state: 'unreachable',
            info: null,
            message: 'It went away.',
        });
    });

    test('reads the information out of the body of a failed reading when it has the shape of the daemon', () => {
        expect(mapDaemonHealthUseCase(undefined, httpError(503, status))).toEqual({
            state: 'reachable',
            info: status,
            message: null,
        });
    });

    test('does not read the information out of a body that carries only a part of the shape', () => {
        const partial = { serverVersion: '25.0.3', operatingSystem: 'Debian GNU/Linux 12' };

        expect(mapDaemonHealthUseCase(undefined, httpError(503, partial))).toEqual({
            state: 'unreadable',
            info: null,
            message: UNREADABLE_MESSAGE,
        });
    });

    test('reports that the state could not be read when the call itself fails', () => {
        expect(mapDaemonHealthUseCase(undefined, httpError(0, null))).toEqual({
            state: 'unreadable',
            info: null,
            message: UNREADABLE_MESSAGE,
        });
    });

    test('reports that the state could not be read when the code is another one', () => {
        const error = httpError(503, { statusCode: 503, code: 'SERVER_ERROR', message: 'Internal Server Error' });

        expect(mapDaemonHealthUseCase(undefined, error)).toEqual({
            state: 'unreadable',
            info: null,
            message: UNREADABLE_MESSAGE,
        });
    });

    test('reports that the state could not be read when there is no value and no error', () => {
        expect(mapDaemonHealthUseCase(undefined, undefined)).toEqual({
            state: 'unreadable',
            info: null,
            message: UNREADABLE_MESSAGE,
        });
    });
});
