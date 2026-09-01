/* eslint-disable no-secrets/no-secrets */
import { QrCodeRendererAdapter } from '../qrcode-renderer.adapter';

const URI = 'otpauth://totp/GitPaaS:admin@example.com?secret=JBSWY3DPEHPK3PXP';

describe('QrCodeRendererAdapter', () => {
    let sut: QrCodeRendererAdapter;

    beforeEach(() => {
        jest.clearAllMocks();
        sut = new QrCodeRendererAdapter();
    });

    describe('toDataUrl', () => {
        it('renders a PNG a browser can show directly', async () => {
            const result = await sut.toDataUrl(URI);

            expect(result.startsWith('data:image/png;base64,')).toBe(true);
        });

        it('renders the same image for the same text', async () => {
            const [first, second] = await Promise.all([sut.toDataUrl(URI), sut.toDataUrl(URI)]);

            expect(first).toBe(second);
        });

        it('renders a different image for a different text', async () => {
            const [first, second] = await Promise.all([sut.toDataUrl(URI), sut.toDataUrl(`${URI}&period=60`)]);

            expect(first).not.toBe(second);
        });

        it('rejects when the text is too long for a QR code', async () => {
            await expect(sut.toDataUrl('x'.repeat(10_000))).rejects.toThrow();
        });
    });
});
