import { AsyncLocalStorage } from 'node:async_hooks';

import type { TelemetryEvent } from '../../domain/models/telemetry.models';

/**
 * Telemetry event of the unit of work currently running.
 */
const storage = new AsyncLocalStorage<Partial<TelemetryEvent>>();

/**
 * Runs a unit of work inside a fresh telemetry scope.
 *
 * @param seed Fields known when the unit of work starts
 * @param work Unit of work to run
 *
 * @returns Whatever the unit of work returns
 */
export function runWithTelemetry<T>(seed: Partial<TelemetryEvent>, work: () => T): T {
    return storage.run({ ...seed }, work);
}

/**
 * Gives the telemetry event of the current unit of work.
 *
 * @returns The telemetry event being accumulated, or `undefined` outside a unit of work
 */
export function getTelemetry(): Partial<TelemetryEvent> | undefined {
    return storage.getStore();
}

/**
 * Adds fields to the telemetry event of the current unit of work.
 *
 * @param fields Fields to add
 */
export function enrichTelemetry(fields: Partial<TelemetryEvent>): void {
    Object.assign(storage.getStore() ?? {}, fields);
}
