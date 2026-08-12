import { Injectable } from '@nestjs/common';

import type { WideEvent } from '../../domain/models/wide-event.models';
import type { WideEventSink } from '../../domain/ports/wide-event-sink.port';

/**
 * Stdout wide event sink adapter.
 */
@Injectable()
export class StdoutWideEventSinkAdapter implements WideEventSink {
    public emit(event: WideEvent): void {
        try {
            process.stdout.write(`${JSON.stringify(event)}\n`);
        } catch {
            // An observability failure must never fail a unit of work
        }
    }
}
