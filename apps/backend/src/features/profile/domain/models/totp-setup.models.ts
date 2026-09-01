/**
 * The secret a setup of the second factor drew.
 */
export interface TotpSetup {
    secret: string;
    otpauthUri: string;
    qrCode: string;
}
