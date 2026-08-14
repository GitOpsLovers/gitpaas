import { ServerStatus } from '../domain/models/server-status.model';

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

describe('mapDaemonHealthUseCase', () => {
    it('The daemon answers', () => {
        expect(mapDaemonHealthUseCase(status, undefined)).toEqual({
            state: 'reachable',
            info: status,
            message: null,
        });
    });

    it('The daemon does not answer', () => {
        expect(mapDaemonHealthUseCase(undefined, httpError(503, null))).toEqual({
            state: 'unreachable',
            info: null,
            message: UNREACHABLE_MESSAGE,
        });
    });

    it('shows the message the body of the 503 carries', () => {
        const error = httpError(503, { statusCode: 503, message: 'The Docker daemon did not answer.' });

        expect(mapDaemonHealthUseCase(undefined, error)).toEqual({
            state: 'unreachable',
            info: null,
            message: 'The Docker daemon did not answer.',
        });
    });

    it('reads the information out of the body of a failed reading when it has the shape of the daemon', () => {
        expect(mapDaemonHealthUseCase(undefined, httpError(503, status))).toEqual({
            state: 'reachable',
            info: status,
            message: null,
        });
    });

    it('reports that the state could not be read when the call itself fails', () => {
        expect(mapDaemonHealthUseCase(undefined, httpError(0, null))).toEqual({
            state: 'unreadable',
            info: null,
            message: UNREADABLE_MESSAGE,
        });
    });

    it('reports that the state could not be read when the answer is not a 503', () => {
        expect(mapDaemonHealthUseCase(undefined, httpError(500, { message: 'Internal Server Error' }))).toEqual({
            state: 'unreadable',
            info: null,
            message: UNREADABLE_MESSAGE,
        });
    });

    it('reports that the state could not be read when there is no value and no error', () => {
        expect(mapDaemonHealthUseCase(undefined, undefined)).toEqual({
            state: 'unreadable',
            info: null,
            message: UNREADABLE_MESSAGE,
        });
    });
});
