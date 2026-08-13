import type { TelemetryEvent } from '../domain/models/telemetry.models';

/**
 * Use case for deciding, once the outcome of the unit of work is known, whether its telemetry event is kept.
 *
 * @param _event Completed telemetry event
 *
 * @returns `true` when the event must reach the writer
 */
export function shouldKeepTelemetryUseCase(_event: TelemetryEvent): boolean {
    return true;
}
