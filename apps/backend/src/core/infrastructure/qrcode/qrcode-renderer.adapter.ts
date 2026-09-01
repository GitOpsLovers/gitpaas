import { Injectable } from '@nestjs/common';
import { toDataURL } from 'qrcode';

import type { QrCodeRenderer } from '../../domain/ports/qr-code-renderer.port';

/**
 * `qrcode`-backed implementation of the {@link QrCodeRenderer} port.
 */
@Injectable()
export class QrCodeRendererAdapter implements QrCodeRenderer {
    /**
     * Renders a text into a PNG of a QR code.
     *
     * @param text Text the image encodes
     *
     * @returns The image, as a `data:image/png;base64,` address
     */
    public toDataUrl(text: string): Promise<string> {
        return toDataURL(text);
    }
}
