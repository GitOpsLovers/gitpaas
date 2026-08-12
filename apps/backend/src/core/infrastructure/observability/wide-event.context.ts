import { AsyncLocalStorage } from 'node:async_hooks';

import type { WideEvent } from '../../domain/models/wide-event.models';

/**
 * Wide event of the unit of work currently running.
 */
const storage = new AsyncLocalStorage<Partial<WideEvent>>();

/**
 * Runs a unit of work inside a fresh wide-event scope.
 *
 * @param seed Fields known when the unit of work starts
 * @param work Unit of work to run
 *
 * @returns Whatever the unit of work returns
 */
export function runWithWideEvent<T>(seed: Partial<WideEvent>, work: () => T): T {
    return storage.run({ ...seed }, work);
}

/**
 * Gives the wide event of the current unit of work.
 *
 * @returns The wide event being accumulated, or `undefined` outside a unit of work
 */
export function getWideEvent(): Partial<WideEvent> | undefined {
    return storage.getStore();
}

/**
 * Adds fields to the wide event of the current unit of work.
 *
 * @param fields Fields to add
 */
export function enrichWideEvent(fields: Partial<WideEvent>): void {
    Object.assign(storage.getStore() ?? {}, fields);
}
