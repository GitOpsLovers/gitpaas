import { formatByteSizeUseCase } from './format-byte-size.use-case';

describe('formatByteSizeUseCase', () => {
    test('shows a count under one kilobyte as a whole number of bytes', () => {
        expect(formatByteSizeUseCase(512)).toBe('512 B');
    });

    test('shows zero as zero bytes', () => {
        expect(formatByteSizeUseCase(0)).toBe('0 B');
    });

    test('shows a negative count as zero bytes', () => {
        expect(formatByteSizeUseCase(-1)).toBe('0 B');
    });

    test('scales the count to the largest unit it fills, with one decimal', () => {
        expect(formatByteSizeUseCase(2048)).toBe('2.0 KB');
        expect(formatByteSizeUseCase(1_572_864)).toBe('1.5 MB');
        expect(formatByteSizeUseCase(3 * 1024 ** 3)).toBe('3.0 GB');
    });

    test('stops at the terabyte, the largest unit of the scale', () => {
        expect(formatByteSizeUseCase(2048 * 1024 ** 4)).toBe('2048.0 TB');
    });
});
