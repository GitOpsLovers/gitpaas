/**
 * QR code rendering port.
 */
export interface QrCodeRenderer {
    /**
     * Renders a text into the image of a QR code.
     *
     * @param text Text the image encodes
     *
     * @returns The image, as a `data:` address a browser can show directly
     */
    toDataUrl: (text: string) => Promise<string>;
}
