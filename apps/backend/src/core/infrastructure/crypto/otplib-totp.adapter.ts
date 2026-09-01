import { Injectable } from '@nestjs/common';
import { generateSecret, generateURI, verify } from 'otplib';

import type { Totp } from '../../domain/ports/totp.port';

/**
 * Name of the platform, which the authenticator shows above the account.
 */
const ISSUER = 'GitPaaS';

/**
 * Count of the seconds a code stays valid on each side of the current step.
 */
const EPOCH_TOLERANCE_SECONDS = 30;

/**
 * `otplib`-backed implementation of the {@link Totp} port.
 */
@Injectable()
export class OtplibTotpAdapter implements Totp {
    /**
     * Draws a fresh secret an authenticator can hold.
     *
     * @returns The secret, in the Base32 form the authenticators read
     */
    public generateSecret(): string {
        return generateSecret();
    }

    /**
     * Builds the `otpauth://` address an authenticator enrols from.
     *
     * @param secret Secret of the account, in the Base32 form
     * @param accountLabel Label the authenticator shows for the account
     *
     * @returns The `otpauth://` address
     */
    public buildKeyUri(secret: string, accountLabel: string): string {
        return generateURI({ issuer: ISSUER, label: accountLabel, secret });
    }

    /**
     * Checks a code of six digits against a secret, allowing one step of drift.
     *
     * @param secret Secret of the account, in the Base32 form
     * @param code Code the client presented
     *
     * @returns Whether the code belongs to that secret
     */
    public async verifyCode(secret: string, code: string): Promise<boolean> {
        const result = await verify({ secret, token: code, epochTolerance: EPOCH_TOLERANCE_SECONDS });

        return result.valid;
    }
}
