import { z } from 'zod';

import { TELEMETRY_DEFAULT_SAMPLE_RATE, TELEMETRY_DEFAULT_SLOW_MS } from '../../domain/constants/telemetry.constants';
import { formatZodIssue } from '../../ui/pipes/zod-issue.formatter';

/**
 * Runtime environment the application boots into
 */
enum Environment {
    Development = 'development',
    Production = 'production',
    Test = 'test',
}

/**
 * A text variable the boot cannot do without
 */
const requiredText = z.string().min(1);

/**
 * A numeric variable, which arrives from the environment as a text
 */
const requiredNumber = z.coerce.number();

/**
 * An optional text variable, where an empty value counts as an absent one
 */
const optionalText = z
    .string()
    .optional()
    .transform((value) => (value === undefined || value.trim() === '' ? undefined : value));

/**
 * Shape and constraints of the environment variables the backend understands
 */
const environmentSchema = z.object({
    NODE_ENV: z.enum(Environment),
    PORT: requiredNumber,
    DB_HOST: requiredText,
    DB_PORT: requiredNumber,
    DB_USER: requiredText,
    DB_PASSWORD: requiredText,
    DB_NAME: requiredText,
    REDIS_HOST: requiredText,
    REDIS_PORT: requiredNumber,
    REDIS_PASSWORD: z.string().optional(),
    SECRETS_ENCRYPTION_KEY: requiredText,
    CORS_ORIGIN: requiredText,
    APP_BASE_URL: z.url({ protocol: /^https?$/ }),
    THROTTLE_TTL: requiredNumber,
    THROTTLE_LIMIT: requiredNumber,
    THROTTLE_STREAM_TTL: requiredNumber,
    THROTTLE_STREAM_LIMIT: requiredNumber,
    LOGS_MAX_LINES: requiredNumber,
    TELEMETRY_SLOW_MS: requiredNumber.default(TELEMETRY_DEFAULT_SLOW_MS),
    TELEMETRY_SAMPLE_RATE: requiredNumber.min(0).max(1).default(TELEMETRY_DEFAULT_SAMPLE_RATE),
    PROXY_ACME_PATH: optionalText,
    JWT_ACCESS_SECRET: requiredText,
    JWT_ACCESS_EXPIRES_IN: requiredText,
    JWT_REFRESH_SECRET: requiredText,
    JWT_REFRESH_EXPIRES_IN: requiredText,
});

/**
 * Shape of the environment the rest of the backend reads
 */
export type EnvironmentVariables = z.infer<typeof environmentSchema>;

/**
 * Validates the raw environment at boot
 *
 * @param config Raw environment record
 *
 * @returns The validated, type-coerced configuration
 *
 * @throws Error When one variable or more does not satisfy the schema
 */
export function validate(config: Record<string, unknown>): EnvironmentVariables {
    const result = environmentSchema.safeParse(config);

    if (!result.success) {
        const details = result.error.issues.map(formatZodIssue).join('; ');

        throw new Error(`Invalid environment configuration: ${details}`);
    }

    return result.data;
}
