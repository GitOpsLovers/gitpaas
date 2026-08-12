import type { WideEvent } from '../../../domain/models/wide-event.models';
import { enrichWideEvent, getWideEvent, runWithWideEvent } from '../wide-event.context';

describe('runWithWideEvent', () => {
    it('exposes a copy of the seed inside the scope', () => {
        const seed = { 'request.id': 'correlation-id' };

        const store = runWithWideEvent(seed, () => getWideEvent());

        expect(store).toEqual(seed);
        expect(store).not.toBe(seed);
    });

    it('returns whatever the unit of work returns', () => {
        expect(runWithWideEvent({}, () => 'done')).toBe('done');
    });

    it('closes the scope once the unit of work ends', () => {
        runWithWideEvent({}, () => undefined);

        expect(getWideEvent()).toBeUndefined();
    });

    it('never lets a later change of the seed reach the scope', () => {
        const seed: { 'request.id': string } = { 'request.id': 'correlation-id' };

        const store = runWithWideEvent(seed, () => {
            seed['request.id'] = 'changed';

            return getWideEvent();
        });

        expect(store).toEqual({ 'request.id': 'correlation-id' });
    });

    it('isolates the scope of a nested unit of work', () => {
        const store = runWithWideEvent({ 'request.id': 'outer' }, () => {
            runWithWideEvent({ 'request.id': 'inner' }, () => {
                enrichWideEvent({ 'project.id': 'inner-project' });
            });

            return getWideEvent();
        });

        expect(store).toEqual({ 'request.id': 'outer' });
    });

    it('isolates two units of work running concurrently', async () => {
        const scope = async (requestId: string): Promise<Partial<WideEvent> | undefined> =>
            runWithWideEvent({ 'request.id': requestId }, async () => {
                await Promise.resolve();
                enrichWideEvent({ 'project.id': `project-${requestId}` });
                await Promise.resolve();

                return getWideEvent();
            });

        const [first, second] = await Promise.all([scope('first'), scope('second')]);

        expect(first).toEqual({ 'request.id': 'first', 'project.id': 'project-first' });
        expect(second).toEqual({ 'request.id': 'second', 'project.id': 'project-second' });
    });

    it('keeps the scope across an asynchronous boundary', async () => {
        const store = await runWithWideEvent({ 'request.id': 'correlation-id' }, async () => {
            await Promise.resolve();

            return getWideEvent();
        });

        expect(store).toEqual({ 'request.id': 'correlation-id' });
    });
});

describe('enrichWideEvent', () => {
    it('adds fields to the event of the current unit of work', () => {
        const store = runWithWideEvent({ 'request.id': 'correlation-id' }, () => {
            enrichWideEvent({ 'project.id': 'project-1' });

            return getWideEvent();
        });

        expect(store).toEqual({ 'request.id': 'correlation-id', 'project.id': 'project-1' });
    });

    it('overwrites a field that was already set', () => {
        const store = runWithWideEvent({ 'http.status_code': 200 }, () => {
            enrichWideEvent({ 'http.status_code': 500 });

            return getWideEvent();
        });

        expect(store).toEqual({ 'http.status_code': 500 });
    });

    it('reaches a reference the caller kept before an asynchronous boundary', async () => {
        // The middleware keeps this reference, so an enrichment still lands on the emitted event
        let kept: Partial<WideEvent> | undefined;

        await runWithWideEvent({ 'request.id': 'correlation-id' }, async () => {
            kept = getWideEvent();

            await Promise.resolve();
            enrichWideEvent({ 'deployment.id': 'deployment-1' });
        });

        expect(kept).toEqual({ 'request.id': 'correlation-id', 'deployment.id': 'deployment-1' });
    });

    it('adds the fields of several calls together', () => {
        const store = runWithWideEvent({ 'request.id': 'correlation-id' }, () => {
            enrichWideEvent({ 'user.id': 'user-1' });
            enrichWideEvent({ 'project.id': 'project-1' });

            return getWideEvent();
        });

        expect(store).toEqual({
            'request.id': 'correlation-id',
            'user.id': 'user-1',
            'project.id': 'project-1',
        });
    });

    it('keeps the event unchanged when there is no field to add', () => {
        const store = runWithWideEvent({ 'request.id': 'correlation-id' }, () => {
            enrichWideEvent({});

            return getWideEvent();
        });

        expect(store).toEqual({ 'request.id': 'correlation-id' });
    });

    it('does nothing outside a unit of work', () => {
        expect(() => enrichWideEvent({ 'project.id': 'project-1' })).not.toThrow();
        expect(getWideEvent()).toBeUndefined();
    });
});
