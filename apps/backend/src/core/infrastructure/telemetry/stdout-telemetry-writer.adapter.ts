import { Injectable } from '@nestjs/common';

import type { TelemetryEvent } from '../../domain/models/telemetry.models';
import type { TelemetryWriter } from '../../domain/ports/telemetry-writer.port';

/**
 * Stdout telemetry writer adapter.
 */
@Injectable()
export class StdoutTelemetryWriterAdapter implements TelemetryWriter {
    public emit(event: TelemetryEvent): void {
        try {
            process.stdout.write(`${JSON.stringify(event)}\n`);
        } catch {
            // An observability failure must never fail a unit of work
        }
    }
}
