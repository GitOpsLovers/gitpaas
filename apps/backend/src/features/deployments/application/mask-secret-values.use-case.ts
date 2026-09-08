/**
 * Text that takes the place of the value of a secret in a line of the log of a deployment.
 */
export const SECRET_MASK = '****';

/**
 * Use case that hides the value of every secret of a service in one line of the log of a deployment.
 *
 * @param line Line of the log, as the executor produced it
 * @param secrets Clear values of the variables of a secret of the service
 *
 * @returns The line with every value of a secret replaced by the mask
 */
export function maskSecretValuesUseCase(line: string, secrets: string[]): string {
    // The longest value goes first, so a secret that holds another one still hides it whole.
    const values = [...new Set(secrets.filter((secret) => secret !== ''))].sort((one, other) => other.length - one.length);

    return values.reduce((masked, value) => masked.split(value).join(SECRET_MASK), line);
}
