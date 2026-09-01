/* eslint-disable no-secrets/no-secrets */
import {
    enableTotpSchema,
    loginResultSchema,
    TOTP_CODE_LENGTH,
    totpCodeSchema,
    totpSetupSchema,
    twoFactorChallengeSchema,
    verifyTwoFactorSchema,
} from '../two-factor.contract';

/** A signed token of three parts, which `z.jwt()` accepts. */
const jwt = 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxIn0.9L8kQKzGqvJ8mQnWc0m3O3d6rXwZ4vT5uY1aBcDeFgH';

describe('TOTP_CODE_LENGTH', () => {
    it('names six digits', () => {
        expect(TOTP_CODE_LENGTH).toBe(6);
    });
});

describe('totpCodeSchema', () => {
    it('accepts a code of six digits', () => {
        expect(totpCodeSchema.safeParse('123456').success).toBe(true);
    });

    it('refuses a code shorter than six digits', () => {
        expect(totpCodeSchema.safeParse('12345').success).toBe(false);
    });

    it('refuses a code longer than six digits', () => {
        expect(totpCodeSchema.safeParse('1234567').success).toBe(false);
    });

    it('refuses a code that carries a letter', () => {
        expect(totpCodeSchema.safeParse('12345a').success).toBe(false);
    });
});

describe('twoFactorChallengeSchema', () => {
    it('accepts a challenge', () => {
        const result = twoFactorChallengeSchema.safeParse({ twoFactorRequired: true, challengeToken: jwt });

        expect(result.success).toBe(true);
    });

    it('refuses a challenge whose flag is false', () => {
        const result = twoFactorChallengeSchema.safeParse({ twoFactorRequired: false, challengeToken: jwt });

        expect(result.success).toBe(false);
    });
});

describe('loginResultSchema', () => {
    it('accepts a pair of tokens', () => {
        const result = loginResultSchema.safeParse({ accessToken: 'a', refreshToken: 'r' });

        expect(result.success).toBe(true);
    });

    it('accepts a challenge of the second factor', () => {
        const result = loginResultSchema.safeParse({ twoFactorRequired: true, challengeToken: jwt });

        expect(result.success).toBe(true);
    });

    it('refuses an answer that is neither a pair nor a challenge', () => {
        expect(loginResultSchema.safeParse({ accessToken: 'a' }).success).toBe(false);
    });
});

describe('verifyTwoFactorSchema', () => {
    it('accepts a challenge token and a code of six digits', () => {
        expect(verifyTwoFactorSchema.safeParse({ challengeToken: jwt, code: '123456' }).success).toBe(true);
    });

    it('refuses a challenge token that is not a signed token', () => {
        expect(verifyTwoFactorSchema.safeParse({ challengeToken: 'nope', code: '123456' }).success).toBe(false);
    });

    it('refuses a code that is not six digits', () => {
        expect(verifyTwoFactorSchema.safeParse({ challengeToken: jwt, code: '12' }).success).toBe(false);
    });

    it('refuses an unknown key', () => {
        const result = verifyTwoFactorSchema.safeParse({ challengeToken: jwt, code: '123456', extra: 1 });

        expect(result.success).toBe(false);
    });
});

describe('totpSetupSchema', () => {
    it('accepts a setup', () => {
        const result = totpSetupSchema.safeParse({
            secret: 'JBSWY3DPEHPK3PXP',
            otpauthUri: 'otpauth://totp/GitPaaS:admin@example.com?secret=JBSWY3DPEHPK3PXP',
            qrCode: 'data:image/png;base64,AAAA',
        });

        expect(result.success).toBe(true);
    });

    it('refuses a setup with no image of the QR', () => {
        const result = totpSetupSchema.safeParse({ secret: 'JBSWY3DPEHPK3PXP', otpauthUri: 'otpauth://totp/x' });

        expect(result.success).toBe(false);
    });
});

describe('enableTotpSchema', () => {
    it('accepts a code of six digits', () => {
        expect(enableTotpSchema.safeParse({ code: '123456' }).success).toBe(true);
    });

    it('refuses an unknown key', () => {
        expect(enableTotpSchema.safeParse({ code: '123456', secret: 'x' }).success).toBe(false);
    });
});
