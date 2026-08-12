import type { WideEvent } from '../domain/models/wide-event.models';

/**
 * Use case for deciding, once the outcome of the unit of work is known, whether its wide event is kept.
 *
 * @param _event Completed wide event
 *
 * @returns `true` when the event must reach the sink
 */
export function shouldKeepWideEventUseCase(_event: WideEvent): boolean {
    return true;
}
