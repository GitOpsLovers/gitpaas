/**
 * Number of bytes one unit of the scale holds.
 */
const BYTES_PER_UNIT = 1024;

/**
 * Units of the scale, from the byte upwards.
 */
const UNITS = ['B', 'KB', 'MB', 'GB', 'TB'];

/**
 * Formats a count of bytes into the compact size a table shows.
 *
 * @param bytes Count of bytes the daemon reports
 *
 * @returns Size such as `1.5 MB`, and `0 B` when the count is zero or negative
 */
export function formatByteSizeUseCase(bytes: number): string {
    if (bytes <= 0) {
        return '0 B';
    }

    const exponent = Math.min(Math.floor(Math.log(bytes) / Math.log(BYTES_PER_UNIT)), UNITS.length - 1);
    const size = bytes / BYTES_PER_UNIT ** exponent;

    // eslint-disable-next-line security/detect-object-injection
    return `${exponent === 0 ? size : size.toFixed(1)} ${UNITS[exponent]}`;
}
