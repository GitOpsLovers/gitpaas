import { TELEMETRY_MAX_STACK_LENGTH } from '../domain/constants/telemetry.constants';

/**
 * Marker appended to a stack that did not fit in the telemetry event.
 *
 * @param removed Number of characters dropped from the end of the stack
 *
 * @returns Human-readable truncation marker
 */
function buildTruncationMarker(removed: number): string {
    return `\n… [truncated ${removed} characters]`;
}

/**
 * Caps a stack at `TELEMETRY_MAX_STACK_LENGTH`, keeping its first characters.
 *
 * @param stack Stack of the error, possibly joined with the stacks of its chained causes
 *
 * @returns The stack unchanged, or its first characters followed by the truncation marker
 */
export function truncateStackUseCase(stack: string): string {
    if (stack.length <= TELEMETRY_MAX_STACK_LENGTH) {
        return stack;
    }

    let marker = buildTruncationMarker(stack.length - TELEMETRY_MAX_STACK_LENGTH);
    let removed = stack.length - (TELEMETRY_MAX_STACK_LENGTH - marker.length);

    while (marker !== buildTruncationMarker(removed)) {
        marker = buildTruncationMarker(removed);
        removed = stack.length - (TELEMETRY_MAX_STACK_LENGTH - marker.length);
    }

    return `${stack.slice(0, TELEMETRY_MAX_STACK_LENGTH - marker.length)}${marker}`;
}
