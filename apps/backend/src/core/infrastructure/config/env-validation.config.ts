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
 * Number of characters a secret of a token JWT must hold, so a brute force stays out of reach
 */
const JWT_SECRET_MIN_LENGTH = 32;

/**
 * A secret of a token JWT, long enough to resist a brute force
 */
const jwtSecret = z.string().min(JWT_SECRET_MIN_LENGTH);

/**
 * The key of the encryption of the secrets: 32 bytes written as 64 hexadecimal characters
 */
const encryptionKey = z
    .string()
    .regex(/^[\da-f]{64}$/i, 'must hold 32 bytes in the hexadecimal form, that is 64 characters');

/**
 * The hosts of a database that live on the machine of the backend itself
 */
const LOCAL_DB_HOSTS = ['localhost', '127.0.0.1', '::1', '0.0.0.0', 'host.docker.internal'];

/**
 * A switch of the environment, where the absent value keeps the feature on
 */
const enabledFlag = z
    .enum(['true', 'false'])
    .default('true')
    .transform((value) => value === 'true');

/**
 * The number of days a line of the output of a container stays, when the environment names none
 */
const RUNTIME_LOGS_DEFAULT_RETENTION_DAYS = 7;

/**
 * The port the container of pgAdmin publishes on the host, when the environment names none
 */
const PGADMIN_DEFAULT_PORT = 5050;

/**
 * The pinned image the session of the debug of the database runs, when the environment names none
 */
const PGADMIN_DEFAULT_IMAGE = 'elestio/pgadmin:REL-9_17';

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
    SECRETS_ENCRYPTION_KEY: encryptionKey,
    CORS_ORIGIN: requiredText,
    APP_BASE_URL: z.url({ protocol: /^https?$/ }),
    THROTTLE_TTL: requiredNumber,
    THROTTLE_LIMIT: requiredNumber,
    THROTTLE_STREAM_TTL: requiredNumber,
    THROTTLE_STREAM_LIMIT: requiredNumber,
    LOGS_MAX_LINES: requiredNumber,
    RUNTIME_LOGS_RETENTION_DAYS: requiredNumber.min(1).default(RUNTIME_LOGS_DEFAULT_RETENTION_DAYS),
    TELEMETRY_SLOW_MS: requiredNumber.default(TELEMETRY_DEFAULT_SLOW_MS),
    TELEMETRY_SAMPLE_RATE: requiredNumber.min(0).max(1).default(TELEMETRY_DEFAULT_SAMPLE_RATE),
    PGADMIN_PORT: requiredNumber.int().min(1).max(65535).default(PGADMIN_DEFAULT_PORT),
    PGADMIN_IMAGE: requiredText.default(PGADMIN_DEFAULT_IMAGE),
    PROXY_ACME_PATH: optionalText,
    DEPLOY_SPOOL_DIR: optionalText,
    UPDATE_CHECK_ENABLED: enabledFlag,
    JWT_ACCESS_SECRET: jwtSecret,
    JWT_ACCESS_EXPIRES_IN: requiredText,
    JWT_REFRESH_SECRET: jwtSecret,
    JWT_REFRESH_EXPIRES_IN: requiredText,
    JWT_2FA_SECRET: jwtSecret,
}).superRefine((config, context) => {
    if (config.NODE_ENV !== Environment.Production) {
        return;
    }

    if (LOCAL_DB_HOSTS.includes(config.DB_HOST.trim().toLowerCase())) {
        context.addIssue({
            code: 'custom',
            path: ['DB_HOST'],
            message: 'must name a remote database in production, and never the machine of the backend',
        });
    }
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
