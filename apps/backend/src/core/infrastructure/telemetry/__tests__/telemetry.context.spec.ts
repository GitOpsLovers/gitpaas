import type { TelemetryEvent } from '../../../domain/models/telemetry.models';
import { enrichTelemetry, getTelemetry, runWithTelemetry } from '../telemetry.context';

describe('runWithTelemetry', () => {
    it('exposes a copy of the seed inside the scope', () => {
        const seed = { 'request.id': 'correlation-id' };

        const store = runWithTelemetry(seed, () => getTelemetry());

        expect(store).toEqual(seed);
        expect(store).not.toBe(seed);
    });

    it('returns whatever the unit of work returns', () => {
        expect(runWithTelemetry({}, () => 'done')).toBe('done');
    });

    it('closes the scope once the unit of work ends', () => {
        runWithTelemetry({}, () => undefined);

        expect(getTelemetry()).toBeUndefined();
    });

    it('never lets a later change of the seed reach the scope', () => {
        const seed: { 'request.id': string } = { 'request.id': 'correlation-id' };

        const store = runWithTelemetry(seed, () => {
            seed['request.id'] = 'changed';

            return getTelemetry();
        });

        expect(store).toEqual({ 'request.id': 'correlation-id' });
    });

    it('isolates the scope of a nested unit of work', () => {
        const store = runWithTelemetry({ 'request.id': 'outer' }, () => {
            runWithTelemetry({ 'request.id': 'inner' }, () => {
                enrichTelemetry({ 'project.id': 'inner-project' });
            });

            return getTelemetry();
        });

        expect(store).toEqual({ 'request.id': 'outer' });
    });

    it('isolates two units of work running concurrently', async () => {
        const scope = async (requestId: string): Promise<Partial<TelemetryEvent> | undefined> =>
            runWithTelemetry({ 'request.id': requestId }, async () => {
                await Promise.resolve();
                enrichTelemetry({ 'project.id': `project-${requestId}` });
                await Promise.resolve();

                return getTelemetry();
            });

        const [first, second] = await Promise.all([scope('first'), scope('second')]);

        expect(first).toEqual({ 'request.id': 'first', 'project.id': 'project-first' });
        expect(second).toEqual({ 'request.id': 'second', 'project.id': 'project-second' });
    });

    it('keeps the scope across an asynchronous boundary', async () => {
        const store = await runWithTelemetry({ 'request.id': 'correlation-id' }, async () => {
            await Promise.resolve();

            return getTelemetry();
        });

        expect(store).toEqual({ 'request.id': 'correlation-id' });
    });
});

describe('enrichTelemetry', () => {
    it('adds fields to the event of the current unit of work', () => {
        const store = runWithTelemetry({ 'request.id': 'correlation-id' }, () => {
            enrichTelemetry({ 'project.id': 'project-1' });

            return getTelemetry();
        });

        expect(store).toEqual({ 'request.id': 'correlation-id', 'project.id': 'project-1' });
    });

    it('overwrites a field that was already set', () => {
        const store = runWithTelemetry({ 'http.status_code': 200 }, () => {
            enrichTelemetry({ 'http.status_code': 500 });

            return getTelemetry();
        });

        expect(store).toEqual({ 'http.status_code': 500 });
    });

    it('reaches a reference the caller kept before an asynchronous boundary', async () => {
        // The middleware keeps this reference, so an enrichment still lands on the emitted event
        let kept: Partial<TelemetryEvent> | undefined;

        await runWithTelemetry({ 'request.id': 'correlation-id' }, async () => {
            kept = getTelemetry();

            await Promise.resolve();
            enrichTelemetry({ 'deployment.id': 'deployment-1' });
        });

        expect(kept).toEqual({ 'request.id': 'correlation-id', 'deployment.id': 'deployment-1' });
    });

    it('adds the fields of several calls together', () => {
        const store = runWithTelemetry({ 'request.id': 'correlation-id' }, () => {
            enrichTelemetry({ 'user.id': 'user-1' });
            enrichTelemetry({ 'project.id': 'project-1' });

            return getTelemetry();
        });

        expect(store).toEqual({
            'request.id': 'correlation-id',
            'user.id': 'user-1',
            'project.id': 'project-1',
        });
    });

    it('keeps the event unchanged when there is no field to add', () => {
        const store = runWithTelemetry({ 'request.id': 'correlation-id' }, () => {
            enrichTelemetry({});

            return getTelemetry();
        });

        expect(store).toEqual({ 'request.id': 'correlation-id' });
    });

    it('does nothing outside a unit of work', () => {
        expect(() => enrichTelemetry({ 'project.id': 'project-1' })).not.toThrow();
        expect(getTelemetry()).toBeUndefined();
    });
});
