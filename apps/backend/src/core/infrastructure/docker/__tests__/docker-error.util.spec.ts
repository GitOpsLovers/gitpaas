import { toDaemonFailure } from '../docker-error.util';

import { DaemonUnreachableError } from '@core/domain/errors/container-runtime.errors';

/** Builds a failure dockerode raises when the daemon itself answered the call. */
const daemonAnswer = (statusCode: number, message = 'answered'): Error => (
    Object.assign(new Error(message), { statusCode })
);

describe('toDaemonFailure', () => {
    it('wraps a failure of the socket in a DaemonUnreachableError', () => {
        const original = new Error('connect ENOENT /var/run/docker.sock');

        expect(toDaemonFailure(original)).toBeInstanceOf(DaemonUnreachableError);
    });

    it('chains the original failure as the cause of that error', () => {
        const original = new Error('connect ENOENT /var/run/docker.sock');

        expect((toDaemonFailure(original) as Error).cause).toBe(original);
    });

    it('wraps a failure that carries no status code', () => {
        expect(toDaemonFailure('boom')).toBeInstanceOf(DaemonUnreachableError);
    });

    it('lets a 404 of the daemon pass unchanged', () => {
        const answer = daemonAnswer(404, 'no such container');

        expect(toDaemonFailure(answer)).toBe(answer);
    });

    it('lets a 409 of the daemon pass unchanged', () => {
        const answer = daemonAnswer(409, 'volume is in use');

        expect(toDaemonFailure(answer)).toBe(answer);
    });

    it('wraps a 500 of the daemon, which no caller reads as an answer', () => {
        expect(toDaemonFailure(daemonAnswer(500))).toBeInstanceOf(DaemonUnreachableError);
    });

    it('never wraps a DaemonUnreachableError a second time', () => {
        const already = new DaemonUnreachableError();

        expect(toDaemonFailure(already)).toBe(already);
    });
});
