import { TELEMETRY_MAX_STACK_LENGTH } from '../../domain/constants/telemetry.constants';
import { truncateStackUseCase } from '../truncate-stack.use-case';

/** Reads the character count the truncation marker reports. */
const removedCharacters = (stack: string): number => Number(/truncated (\d+) characters/.exec(stack)![1]);

/** Rebuilds the marker the use case appends for a given removed count. */
const markerFor = (removed: number): string => `\n… [truncated ${removed} characters]`;

describe('truncateStackUseCase', () => {
    it('returns a stack shorter than the cap unchanged', () => {
        const stack = `Error: boom\n${'    at frame\n'.repeat(10)}`;

        expect(truncateStackUseCase(stack)).toBe(stack);
    });

    it('appends no truncation marker to a stack shorter than the cap', () => {
        const stack = 'Error: boom\n    at frame';

        expect(truncateStackUseCase(stack)).not.toContain('truncated');
    });

    it('returns a stack of exactly the cap unchanged', () => {
        const stack = 'a'.repeat(TELEMETRY_MAX_STACK_LENGTH);

        const result = truncateStackUseCase(stack);

        expect(result).toBe(stack);
        expect(result).toHaveLength(TELEMETRY_MAX_STACK_LENGTH);
    });

    it('returns an empty stack unchanged', () => {
        expect(truncateStackUseCase('')).toBe('');
    });

    it('caps a stack one character over the limit at exactly the cap', () => {
        const stack = 'b'.repeat(TELEMETRY_MAX_STACK_LENGTH + 1);

        const result = truncateStackUseCase(stack);
        const marker = markerFor(removedCharacters(result));

        expect(result).toHaveLength(TELEMETRY_MAX_STACK_LENGTH);
        expect(result).toBe('b'.repeat(TELEMETRY_MAX_STACK_LENGTH - marker.length) + marker);
    });

    it('keeps the first characters of a long stack, where the failing frame is', () => {
        const head = 'Error: boom\n    at the frame that carries the failure\n';
        const stack = head + 'x'.repeat(TELEMETRY_MAX_STACK_LENGTH * 2);

        const result = truncateStackUseCase(stack);

        expect(result.startsWith(head)).toBe(true);
        expect(result).toHaveLength(TELEMETRY_MAX_STACK_LENGTH);
        expect(result).toMatch(/\n… \[truncated \d+ characters]$/);
    });

    it('reports how many characters the truncation removed', () => {
        const stack = 'y'.repeat(TELEMETRY_MAX_STACK_LENGTH + 500);

        const result = truncateStackUseCase(stack);
        const removed = removedCharacters(result);
        const marker = markerFor(removed);

        expect(removed).toBe(stack.length - (TELEMETRY_MAX_STACK_LENGTH - marker.length));
        expect(result).toBe(stack.slice(0, TELEMETRY_MAX_STACK_LENGTH - marker.length) + marker);
    });

    it('accounts for the marker growing as the removed count gains a digit', () => {
        // The overflow is two digits long, but the marker it needs pushes the removed
        // count to three, so the marker has to be measured again.
        const overflow = 80;
        const stack = 'c'.repeat(TELEMETRY_MAX_STACK_LENGTH + overflow);

        const result = truncateStackUseCase(stack);
        const removed = removedCharacters(result);
        const marker = markerFor(removed);

        expect(String(overflow)).toHaveLength(2);
        expect(String(removed)).toHaveLength(3);
        expect(result).toHaveLength(TELEMETRY_MAX_STACK_LENGTH);
        expect(result.endsWith(marker)).toBe(true);
        expect(removed).toBe(stack.length - (TELEMETRY_MAX_STACK_LENGTH - marker.length));
    });

    it('never returns more than the cap, whatever the size of the stack', () => {
        const sizes = [
            TELEMETRY_MAX_STACK_LENGTH + 1,
            TELEMETRY_MAX_STACK_LENGTH + 9,
            TELEMETRY_MAX_STACK_LENGTH + 1000,
            TELEMETRY_MAX_STACK_LENGTH * 10,
        ];

        for (const size of sizes) {
            expect(truncateStackUseCase('z'.repeat(size))).toHaveLength(TELEMETRY_MAX_STACK_LENGTH);
        }
    });
});
