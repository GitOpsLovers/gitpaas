import type { TelemetryEvent } from '../models/telemetry.models';

/**
 * Destination of the completed telemetry events port.
 */
export interface TelemetryWriter {
    /**
     * Publishes one completed telemetry event.
     *
     * @param event Completed telemetry event
     */
    emit: (event: TelemetryEvent) => void;
}
