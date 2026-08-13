import type { TelemetryEvent, TelemetryEventDependency } from '../../domain/models/telemetry.models';

import { enrichTelemetry, getTelemetry } from './telemetry.context';

/**
 * Adds one outbound dependency call to the counters of the current unit of work.
 *
 * @param name Dependency the call was made to
 * @param durationMs Time spent in the dependency, in milliseconds
 * @param failed Whether the call raised
 */
export function recordDependencyCall(name: TelemetryEventDependency, durationMs: number, failed: boolean): void {
    const event = getTelemetry();

    if (event === undefined) {
        return;
    }

    const calls = event[`deps.${name}.calls`] ?? 0;
    const duration = event[`deps.${name}.duration_ms`] ?? 0;
    const errors = event[`deps.${name}.errors`] ?? 0;
    const max = event[`deps.${name}.max_ms`] ?? 0;

    const fields = {
        [`deps.${name}.calls`]: calls + 1,
        [`deps.${name}.duration_ms`]: duration + durationMs,
        [`deps.${name}.errors`]: errors + (failed ? 1 : 0),
        [`deps.${name}.max_ms`]: Math.max(max, durationMs),
    } as Partial<TelemetryEvent>;

    enrichTelemetry(fields);
}
