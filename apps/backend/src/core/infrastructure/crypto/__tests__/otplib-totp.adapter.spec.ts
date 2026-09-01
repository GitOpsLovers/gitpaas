import { generateSecret, generateURI, verify } from 'otplib';

import { OtplibTotpAdapter } from '../otplib-totp.adapter';

const mockGenerateSecret = generateSecret as jest.MockedFunction<typeof generateSecret>;
const mockGenerateURI = generateURI as jest.MockedFunction<typeof generateURI>;
const mockVerify = verify as jest.MockedFunction<typeof verify>;

const SECRET = 'JBSWY3DPEHPK3PXP';

describe('OtplibTotpAdapter', () => {
    let sut: OtplibTotpAdapter;

    beforeEach(() => {
        jest.clearAllMocks();
        sut = new OtplibTotpAdapter();
    });

    describe('generateSecret', () => {
        it('returns the secret the library draws', () => {
            mockGenerateSecret.mockReturnValue(SECRET);

            expect(sut.generateSecret()).toBe(SECRET);
        });
    });

    describe('buildKeyUri', () => {
        it('names GitPaaS as the issuer and the account as the label', () => {
            mockGenerateURI.mockReturnValue('otpauth://totp/GitPaaS:admin@example.com');

            const result = sut.buildKeyUri(SECRET, 'admin@example.com');

            expect(mockGenerateURI).toHaveBeenCalledTimes(1);
            expect(mockGenerateURI).toHaveBeenCalledWith({
                issuer: 'GitPaaS',
                label: 'admin@example.com',
                secret: SECRET,
            });
            expect(result).toBe('otpauth://totp/GitPaaS:admin@example.com');
        });
    });

    describe('verifyCode', () => {
        it('checks the code against the secret, allowing one step of drift', async () => {
            mockVerify.mockResolvedValue({ valid: true, delta: 0 });

            await sut.verifyCode(SECRET, '123456');

            expect(mockVerify).toHaveBeenCalledTimes(1);
            expect(mockVerify).toHaveBeenCalledWith({ secret: SECRET, token: '123456', epochTolerance: 30 });
        });

        it('returns true when the library accepts the code', async () => {
            mockVerify.mockResolvedValue({ valid: true, delta: 0 });

            await expect(sut.verifyCode(SECRET, '123456')).resolves.toBe(true);
        });

        it('returns false when the library refuses the code', async () => {
            mockVerify.mockResolvedValue({ valid: false });

            await expect(sut.verifyCode(SECRET, '000000')).resolves.toBe(false);
        });

        it('propagates a failure of the library unchanged', async () => {
            const boom = new Error('unsupported algorithm');
            mockVerify.mockRejectedValue(boom);

            await expect(sut.verifyCode(SECRET, '123456')).rejects.toBe(boom);
        });
    });
});
