import type { WideEvent } from '../models/wide-event.models';

/**
 * Destination of the completed wide events port.
 */
export interface WideEventSink {
    /**
     * Publishes one completed wide event.
     *
     * @param event Completed wide event
     */
    emit: (event: WideEvent) => void;
}
